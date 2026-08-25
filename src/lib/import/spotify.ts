import { completedStatusFor } from "@/lib/media-status";
import { spotifyArt, yearFromDate } from "@/lib/media";
import type { UnifiedMediaItem } from "@/lib/types";
import type { createClient } from "@/utils/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

interface ExistingLog {
  id: string;
  on_list: boolean | null;
  is_liked: boolean | null;
}

interface SpotifySavedAlbum {
  album?: {
    id?: string;
    name?: string;
    release_date?: string;
    artists?: Array<{ name?: string }>;
    images?: Array<{ url?: string; width?: number }>;
  };
}

interface SpotifySavedAlbumsPage {
  items?: SpotifySavedAlbum[];
  next?: string | null;
}

const LISTENED = completedStatusFor("music");
const PAGE_SIZE = 50;
const MAX_ALBUMS = 1000;

/** Map a Spotify saved-library album onto Stashd’s shared media shape. */
export function savedAlbumToUnified(album: {
  id: string;
  name?: string;
  release_date?: string;
  artists?: Array<{ name?: string }>;
  images?: Array<{ url?: string; width?: number }>;
}): UnifiedMediaItem {
  return {
    id: `album-${album.id}`,
    title: album.name?.trim() || "Untitled",
    creator: album.artists?.[0]?.name?.trim() || "—",
    year: yearFromDate(album.release_date),
    thumbnail: spotifyArt(album.images),
    mediaType: "music",
  };
}

async function fetchSavedAlbums(
  accessToken: string
): Promise<UnifiedMediaItem[]> {
  const items: UnifiedMediaItem[] = [];
  const seen = new Set<string>();
  let url: string | null =
    `https://api.spotify.com/v1/me/albums?limit=${PAGE_SIZE}`;

  while (url && items.length < MAX_ALBUMS) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Spotify saved albums failed: ${res.status}`);
    }

    const data = (await res.json()) as SpotifySavedAlbumsPage;

    for (const entry of data.items ?? []) {
      const album = entry.album;
      if (!album?.id || seen.has(album.id)) continue;
      seen.add(album.id);
      items.push(
        savedAlbumToUnified({
          id: album.id,
          name: album.name,
          release_date: album.release_date,
          artists: album.artists,
          images: album.images,
        })
      );
      if (items.length >= MAX_ALBUMS) break;
    }

    url = data.next ?? null;
  }

  return items;
}

async function findExistingLog(
  supabase: Supabase,
  userId: string,
  mediaId: string
): Promise<ExistingLog | undefined> {
  const { data } = await supabase
    .from("user_media_logs")
    .select("id, on_list, is_liked")
    .eq("user_id", userId)
    .eq("media_type", "music")
    .eq("media_id", mediaId)
    .limit(1)
    .maybeSingle();

  if (!data?.id) return undefined;
  return {
    id: String(data.id),
    on_list: data.on_list ?? null,
    is_liked: data.is_liked ?? null,
  };
}

async function updateListenedLog(
  supabase: Supabase,
  existing: ExistingLog,
  item: UnifiedMediaItem
): Promise<void> {
  const now = new Date().toISOString();
  const fields: Record<string, unknown> = {
    status: LISTENED,
    on_list: Boolean(existing.on_list),
    is_liked: Boolean(existing.is_liked),
    updated_at: now,
    title: item.title,
    creator: item.creator,
    release_year: item.year,
    image_url: item.thumbnail,
  };

  const { error } = await supabase
    .from("user_media_logs")
    .update(fields)
    .eq("id", existing.id);

  if (!error) return;

  await supabase
    .from("user_media_logs")
    .update({
      status: LISTENED,
      on_list: Boolean(existing.on_list),
      is_liked: Boolean(existing.is_liked),
      updated_at: now,
    })
    .eq("id", existing.id);
}

async function upsertListenedLog(
  supabase: Supabase,
  userId: string,
  item: UnifiedMediaItem,
  existing?: ExistingLog
): Promise<void> {
  if (existing?.id) {
    await updateListenedLog(supabase, existing, item);
    return;
  }

  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from("user_media_logs").insert({
    user_id: userId,
    media_id: item.id,
    media_type: "music",
    status: LISTENED,
    on_list: false,
    is_liked: false,
    updated_at: now,
    title: item.title,
    creator: item.creator,
    release_year: item.year,
    image_url: item.thumbnail,
  });

  if (!insertError) return;

  const raced = await findExistingLog(supabase, userId, item.id);
  if (raced) {
    await updateListenedLog(supabase, raced, item);
    return;
  }

  await supabase.from("user_media_logs").insert({
    user_id: userId,
    media_id: item.id,
    media_type: "music",
    status: LISTENED,
    on_list: false,
    is_liked: false,
    updated_at: now,
  });
}

/**
 * One-shot copy of Spotify Saved Albums → user_media_logs as "listened".
 * Does not persist tokens, write ratings/diary, or mark items liked.
 */
export async function importSpotifySavedAlbums(
  supabase: Supabase,
  userId: string,
  accessToken: string
): Promise<number> {
  const albums = await fetchSavedAlbums(accessToken);
  if (albums.length === 0) return 0;

  const existingByMediaId = new Map<string, ExistingLog>();

  for (let i = 0; i < albums.length; i += PAGE_SIZE) {
    const chunk = albums.slice(i, i + PAGE_SIZE);
    const { data: existingLogs } = await supabase
      .from("user_media_logs")
      .select("id, media_id, on_list, is_liked")
      .eq("user_id", userId)
      .eq("media_type", "music")
      .in(
        "media_id",
        chunk.map((album) => album.id)
      );

    for (const log of existingLogs ?? []) {
      const mediaId = String(log.media_id);
      if (existingByMediaId.has(mediaId)) continue;
      existingByMediaId.set(mediaId, {
        id: String(log.id),
        on_list: log.on_list ?? null,
        is_liked: log.is_liked ?? null,
      });
    }
  }

  for (let i = 0; i < albums.length; i += PAGE_SIZE) {
    const chunk = albums.slice(i, i + PAGE_SIZE);
    await Promise.all(
      chunk.map((album) =>
        upsertListenedLog(
          supabase,
          userId,
          album,
          existingByMediaId.get(album.id)
        )
      )
    );
  }

  return albums.length;
}
