"use server";

import { createClient } from "@/utils/supabase/server";
import { getMediaDetails } from "@/lib/providers/details";
import {
  type DiaryEntry,
  type StashTabItem,
  type WatchlistItem,
} from "@/lib/profile-tabs";
import { isMediaType, type MediaType } from "@/lib/types";

interface RatingRow {
  media_id: string;
  media_type: string;
  rating: number | string | null;
  title: string | null;
  creator: string | null;
  image_url: string | null;
  release_year: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface LogRow {
  media_id: string;
  media_type: string;
  is_liked: boolean | null;
  on_list: boolean | null;
  status: string | null;
  title: string | null;
  creator: string | null;
  image_url: string | null;
  release_year: string | null;
  updated_at: string | null;
  created_at: string | null;
}

interface DiaryRow {
  id: string;
  media_id: string;
  media_type: string;
  title: string | null;
  creator?: string | null;
  image_url: string | null;
  release_year: string | null;
  rating: number | string | null;
  is_liked: boolean | null;
  is_rewatch?: boolean | null;
  watched_on: string;
}

interface StashMetaRow {
  media_id: string;
  media_type: string;
  title: string | null;
  creator: string | null;
  image_url: string | null;
  release_year: string | null;
}

function keyOf(mediaType: string, mediaId: string) {
  return `${mediaType}:${mediaId}`;
}

function asRating(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function needsMeta(item: {
  title: string;
  thumbnail: string | null;
}): boolean {
  return (
    !item.thumbnail ||
    !item.title ||
    item.title === "Untitled" ||
    item.title === "—"
  );
}

async function enrichFromProviders<
  T extends {
    id: string;
    mediaType: MediaType;
    title: string;
    creator: string;
    year: string;
    thumbnail: string | null;
  },
>(items: T[]): Promise<T[]> {
  const incomplete = items.filter(needsMeta);
  if (!incomplete.length) return items;

  const results = await Promise.all(
    incomplete.map(async (item) => {
      try {
        const details = await getMediaDetails(item.mediaType, item.id);
        return { key: keyOf(item.mediaType, item.id), details };
      } catch {
        return { key: keyOf(item.mediaType, item.id), details: null };
      }
    })
  );

  const byKey = new Map(
    results
      .filter((r) => r.details)
      .map((r) => [r.key, r.details!] as const)
  );

  return items.map((item) => {
    const details = byKey.get(keyOf(item.mediaType, item.id));
    if (!details) return item;
    return {
      ...item,
      title:
        item.title === "Untitled" || !item.title ? details.title : item.title,
      creator:
        item.creator === "—" || !item.creator
          ? details.creator
          : item.creator,
      year: item.year === "—" || !item.year ? details.year : item.year,
      thumbnail: item.thumbnail ?? details.thumbnail,
    };
  });
}

/** Persist provider metadata onto rows that were saved without art/title. */
async function backfillMediaMeta(
  userId: string,
  items: Array<{
    id: string;
    mediaType: MediaType;
    title: string;
    creator: string;
    year: string;
    thumbnail: string | null;
  }>
) {
  const supabase = await createClient();
  const complete = items.filter(
    (item) => item.title && item.title !== "Untitled" && item.thumbnail
  );

  await Promise.all(
    complete.map(async (item) => {
      const payload = {
        title: item.title,
        creator: item.creator,
        release_year: item.year,
        image_url: item.thumbnail,
      };

      await Promise.all([
        (async () => {
          try {
            await supabase
              .from("user_ratings")
              .update(payload)
              .eq("user_id", userId)
              .eq("media_id", item.id)
              .eq("media_type", item.mediaType);
          } catch {
            /* ignore backfill failures */
          }
        })(),
        (async () => {
          try {
            await supabase
              .from("user_media_logs")
              .update(payload)
              .eq("user_id", userId)
              .eq("media_id", item.id)
              .eq("media_type", item.mediaType);
          } catch {
            /* ignore backfill failures */
          }
        })(),
      ]);
    })
  );
}

function mergeMeta(
  target: {
    title: string;
    creator: string;
    year: string;
    thumbnail: string | null;
  },
  source: {
    title?: string | null;
    creator?: string | null;
    image_url?: string | null;
    release_year?: string | null;
  }
) {
  if ((!target.title || target.title === "Untitled") && source.title) {
    target.title = source.title;
  }
  if ((!target.creator || target.creator === "—") && source.creator) {
    target.creator = source.creator;
  }
  if ((!target.year || target.year === "—") && source.release_year) {
    target.year = source.release_year;
  }
  if (!target.thumbnail && source.image_url) {
    target.thumbnail = source.image_url;
  }
}

/** Rated + liked (+ diary enrichment) items for the profile Stash tab. */
export async function getStashTabItems(
  userId: string
): Promise<StashTabItem[]> {
  const supabase = await createClient();

  const [ratingsRes, likesRes, diaryRes, stashRes] = await Promise.all([
    supabase
      .from("user_ratings")
      .select(
        "media_id, media_type, rating, title, creator, image_url, release_year, created_at, updated_at"
      )
      .eq("user_id", userId),
    supabase
      .from("user_media_logs")
      .select(
        "media_id, media_type, is_liked, on_list, status, title, creator, image_url, release_year, updated_at, created_at"
      )
      .eq("user_id", userId)
      .eq("is_liked", true),
    supabase
      .from("diary_entries")
      .select(
        "id, media_id, media_type, title, image_url, release_year, rating, is_liked, watched_on"
      )
      .eq("user_id", userId),
    supabase
      .from("stash_items")
      .select("media_id, media_type, title, creator, image_url, release_year")
      .eq("user_id", userId),
  ]);

  // If metadata columns aren't migrated yet, retry ratings with minimal columns
  let ratingRows = (ratingsRes.data as RatingRow[] | null) ?? [];
  if (ratingsRes.error) {
    const fallback = await supabase
      .from("user_ratings")
      .select("media_id, media_type, rating")
      .eq("user_id", userId);
    ratingRows = ((fallback.data as RatingRow[] | null) ?? []).map((row) => ({
      ...row,
      title: null,
      creator: null,
      image_url: null,
      release_year: null,
      created_at: null,
      updated_at: null,
    }));
  }

  let likeRows = (likesRes.data as LogRow[] | null) ?? [];
  if (likesRes.error) {
    const fallback = await supabase
      .from("user_media_logs")
      .select("media_id, media_type, is_liked, updated_at")
      .eq("user_id", userId)
      .eq("is_liked", true);
    likeRows = ((fallback.data as LogRow[] | null) ?? []).map((row) => ({
      ...row,
      on_list: null,
      status: null,
      title: null,
      creator: null,
      image_url: null,
      release_year: null,
      created_at: null,
    }));
  }

  const diaryRows =
    diaryRes.error || !diaryRes.data
      ? []
      : (diaryRes.data as DiaryRow[]);

  const stashRows =
    stashRes.error || !stashRes.data
      ? []
      : (stashRes.data as StashMetaRow[]);

  const stashMeta = new Map(
    stashRows.map((row) => [keyOf(row.media_type, row.media_id), row])
  );

  const map = new Map<string, StashTabItem>();

  for (const row of ratingRows) {
    if (!isMediaType(row.media_type)) continue;
    const key = keyOf(row.media_type, row.media_id);
    const meta = stashMeta.get(key);
    const item: StashTabItem = {
      id: row.media_id,
      mediaType: row.media_type,
      title: row.title || meta?.title || "Untitled",
      creator: row.creator || meta?.creator || "—",
      year: row.release_year || meta?.release_year || "—",
      thumbnail: row.image_url || meta?.image_url || null,
      rating: asRating(row.rating),
      liked: false,
      addedAt: row.updated_at || row.created_at,
    };
    map.set(key, item);
  }

  for (const row of likeRows) {
    if (!isMediaType(row.media_type)) continue;
    const key = keyOf(row.media_type, row.media_id);
    const existing = map.get(key);
    const meta = stashMeta.get(key);

    if (existing) {
      existing.liked = true;
      mergeMeta(existing, row);
      mergeMeta(existing, meta ?? {});
      const ts = row.updated_at || row.created_at;
      if (ts && (!existing.addedAt || ts > existing.addedAt)) {
        existing.addedAt = ts;
      }
    } else {
      map.set(key, {
        id: row.media_id,
        mediaType: row.media_type,
        title: row.title || meta?.title || "Untitled",
        creator: row.creator || meta?.creator || "—",
        year: row.release_year || meta?.release_year || "—",
        thumbnail: row.image_url || meta?.image_url || null,
        rating: null,
        liked: true,
        addedAt: row.updated_at || row.created_at,
      });
    }
  }

  for (const row of diaryRows) {
    if (!isMediaType(row.media_type)) continue;
    const key = keyOf(row.media_type, row.media_id);
    const existing = map.get(key);
    if (existing) {
      mergeMeta(existing, row);
      if (row.is_liked) existing.liked = true;
      if (existing.rating == null) existing.rating = asRating(row.rating);
      if (
        row.watched_on &&
        (!existing.addedAt || row.watched_on > existing.addedAt)
      ) {
        existing.addedAt = row.watched_on;
      }
    } else if (row.is_liked || asRating(row.rating) != null) {
      map.set(key, {
        id: row.media_id,
        mediaType: row.media_type,
        title: row.title || "Untitled",
        creator: row.creator || "—",
        year: row.release_year || "—",
        thumbnail: row.image_url || null,
        rating: asRating(row.rating),
        liked: Boolean(row.is_liked),
        addedAt: row.watched_on,
      });
    }
  }

  const merged = Array.from(map.values());
  const enriched = await enrichFromProviders(merged);

  // Backfill DB so future loads don't re-hit providers
  const newlyFilled = enriched.filter(
    (item, i) => needsMeta(merged[i]) && !needsMeta(item)
  );
  if (newlyFilled.length) {
    void backfillMediaMeta(userId, newlyFilled);
  }

  return enriched.sort((a, b) => {
    const aT = a.addedAt ?? "";
    const bT = b.addedAt ?? "";
    return bT.localeCompare(aT);
  });
}

export async function getDiaryEntriesByUserId(
  userId: string
): Promise<DiaryEntry[]> {
  const supabase = await createClient();

  // Prefer select without `creator` — that column is optional / often missing.
  const primary = await supabase
    .from("diary_entries")
    .select(
      "id, media_id, media_type, title, image_url, release_year, rating, is_liked, is_rewatch, watched_on, created_at"
    )
    .eq("user_id", userId)
    .order("watched_on", { ascending: false })
    .order("created_at", { ascending: false });

  let rows: DiaryRow[] = [];

  if (primary.error) {
    const fallback = await supabase
      .from("diary_entries")
      .select(
        "id, media_id, media_type, title, image_url, release_year, rating, is_liked, watched_on"
      )
      .eq("user_id", userId)
      .order("watched_on", { ascending: false });

    if (fallback.error || !fallback.data) {
      console.error(
        "[getDiaryEntriesByUserId]",
        fallback.error?.message ?? primary.error.message
      );
      return [];
    }

    rows = fallback.data as unknown as DiaryRow[];
  } else {
    rows = (primary.data ?? []) as unknown as DiaryRow[];
  }

  const entries: DiaryEntry[] = rows
    .filter((row) => isMediaType(row.media_type))
    .map((row) => ({
      id: row.id,
      mediaId: row.media_id,
      mediaType: row.media_type as MediaType,
      title: row.title || "Untitled",
      creator: row.creator || "—",
      year: row.release_year || "—",
      thumbnail: row.image_url || null,
      rating: asRating(row.rating),
      liked: Boolean(row.is_liked),
      isRewatch: Boolean(row.is_rewatch),
      loggedOn: row.watched_on,
    }));

  const incomplete = entries.filter((e) =>
    needsMeta({ title: e.title, thumbnail: e.thumbnail })
  );
  if (!incomplete.length) return entries;

  const detailsByKey = new Map(
    (
      await Promise.all(
        incomplete.map(async (entry) => {
          try {
            const details = await getMediaDetails(
              entry.mediaType,
              entry.mediaId
            );
            return [keyOf(entry.mediaType, entry.mediaId), details] as const;
          } catch {
            return null;
          }
        })
      )
    ).filter((row): row is NonNullable<typeof row> => row != null)
  );

  return entries.map((entry) => {
    const details = detailsByKey.get(keyOf(entry.mediaType, entry.mediaId));
    if (!details) return entry;
    return {
      ...entry,
      title:
        entry.title === "Untitled" || !entry.title
          ? details.title
          : entry.title,
      creator:
        entry.creator === "—" || !entry.creator
          ? details.creator
          : entry.creator,
      year: entry.year === "—" || !entry.year ? details.year : entry.year,
      thumbnail: entry.thumbnail ?? details.thumbnail,
    };
  });
}

export async function getWatchlistByUserId(
  userId: string
): Promise<WatchlistItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_media_logs")
    .select(
      "media_id, media_type, on_list, title, creator, image_url, release_year, updated_at, created_at"
    )
    .eq("user_id", userId)
    .eq("on_list", true);

  let rows = (data as LogRow[] | null) ?? [];

  if (error) {
    // Fallback if metadata columns missing
    const fallback = await supabase
      .from("user_media_logs")
      .select("media_id, media_type, on_list, updated_at")
      .eq("user_id", userId)
      .eq("on_list", true);
    rows = ((fallback.data as LogRow[] | null) ?? []).map((row) => ({
      ...row,
      is_liked: null,
      status: null,
      title: null,
      creator: null,
      image_url: null,
      release_year: null,
      created_at: null,
    }));
  }

  const stashRes = await supabase
    .from("stash_items")
    .select("media_id, media_type, title, creator, image_url, release_year")
    .eq("user_id", userId);

  const stashMeta = new Map(
    ((stashRes.data as StashMetaRow[] | null) ?? []).map((row) => [
      keyOf(row.media_type, row.media_id),
      row,
    ])
  );

  const items: WatchlistItem[] = rows
    .filter((row) => isMediaType(row.media_type))
    .map((row) => {
      const meta = stashMeta.get(keyOf(row.media_type, row.media_id));
      return {
        id: row.media_id,
        mediaType: row.media_type as MediaType,
        title: row.title || meta?.title || "Untitled",
        creator: row.creator || meta?.creator || "—",
        year: row.release_year || meta?.release_year || "—",
        thumbnail: row.image_url || meta?.image_url || null,
        addedAt: row.updated_at || row.created_at,
      };
    });

  const enriched = await enrichFromProviders(items);
  const newlyFilled = enriched.filter(
    (item, i) => needsMeta(items[i]) && !needsMeta(item)
  );
  if (newlyFilled.length) {
    void backfillMediaMeta(userId, newlyFilled);
  }

  return enriched;
}
