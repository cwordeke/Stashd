import { getSpotifyAccessToken } from "@/lib/spotify";
import { spotifyArt, yearFromDate } from "@/lib/media";
import type { UnifiedMediaItem } from "@/lib/types";

interface SpotifyImage {
  url: string;
  width?: number;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  album_type?: string;
  release_date?: string;
  images?: SpotifyImage[];
  artists?: SpotifyArtist[];
  total_tracks?: number;
}

/** Non-Latin scripts (Arabic, CJK, Hangul, Cyrillic, Devanagari, Thai, etc.). */
const NON_LATIN_SCRIPT =
  /[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const CLEAN_LABEL =
  /\b(clean(\s+version)?|edited|radio\s+edit)\b/i;

function isEnglishFriendlyText(...parts: Array<string | undefined>): boolean {
  const text = parts.filter(Boolean).join(" ");
  if (!text.trim()) return false;
  return !NON_LATIN_SCRIPT.test(text);
}

/** Full LPs only — no singles, EPs-as-singles, or 1-track “albums”. */
function isFullAlbum(album: SpotifyAlbum): boolean {
  if ((album.album_type ?? "album") !== "album") return false;
  if (typeof album.total_tracks === "number" && album.total_tracks < 2) {
    return false;
  }
  return Boolean(album.id);
}

function toMusicItem(album: SpotifyAlbum): UnifiedMediaItem {
  return {
    id: `album-${album.id}`,
    title: album.name,
    creator: album.artists?.map((a) => a.name).join(", ") || "—",
    year: yearFromDate(album.release_date),
    thumbnail: spotifyArt(album.images),
    mediaType: "music",
  };
}

function normalizeAlbumTitle(name: string): string {
  return name
    .toLowerCase()
    .replace(
      /\s*[\(\[]\s*(clean(\s+version)?|edited|radio\s+edit|explicit)\s*[\)\]]/gi,
      ""
    )
    .replace(/\s*-\s*(clean(\s+version)?|edited|explicit)\s*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function albumDedupeKey(album: SpotifyAlbum): string {
  const artist = (album.artists?.[0]?.name ?? "").toLowerCase().trim();
  return `${artist}::${normalizeAlbumTitle(album.name)}`;
}

function isCleanLabeled(name: string): boolean {
  return CLEAN_LABEL.test(name);
}

async function albumHasExplicitTracks(
  albumId: string,
  token: string
): Promise<boolean> {
  const res = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return false;

  const data = (await res.json()) as {
    tracks?: { items?: Array<{ explicit?: boolean }> };
  };

  return (data.tracks?.items ?? []).some((track) => track.explicit === true);
}

/**
 * Collapse clean/explicit duplicates (same artist + title) using titles only.
 * Avoids extra Spotify album fetches that stall search.
 */
function dedupeByTitle(albums: SpotifyAlbum[]): SpotifyAlbum[] {
  const groups = new Map<string, SpotifyAlbum[]>();

  for (const album of albums) {
    const key = albumDedupeKey(album);
    const group = groups.get(key);
    if (group) group.push(album);
    else groups.set(key, [album]);
  }

  const picked: SpotifyAlbum[] = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      picked.push(group[0]!);
      continue;
    }

    const nonClean = group.filter((album) => !isCleanLabeled(album.name));
    picked.push((nonClean[0] ?? group[0])!);
  }

  return picked;
}

/**
 * Collapse clean/explicit duplicates (same artist + title). Prefer explicit.
 */
async function dedupePreferExplicit(
  albums: SpotifyAlbum[],
  token: string
): Promise<SpotifyAlbum[]> {
  const groups = new Map<string, SpotifyAlbum[]>();

  for (const album of albums) {
    const key = albumDedupeKey(album);
    const group = groups.get(key);
    if (group) group.push(album);
    else groups.set(key, [album]);
  }

  const picked: SpotifyAlbum[] = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      picked.push(group[0]!);
      continue;
    }

    const nonClean = group.filter((album) => !isCleanLabeled(album.name));
    const candidates = nonClean.length > 0 ? nonClean : group;

    if (candidates.length === 1) {
      picked.push(candidates[0]!);
      continue;
    }

    const scored = await Promise.all(
      candidates.map(async (album) => ({
        album,
        explicit: await albumHasExplicitTracks(album.id, token),
      }))
    );

    const explicitHit = scored.find((entry) => entry.explicit);
    picked.push((explicitHit ?? scored[0]!).album);
  }

  return picked;
}

function filterAlbumCandidates(albums: SpotifyAlbum[]): SpotifyAlbum[] {
  const out: SpotifyAlbum[] = [];
  const seenIds = new Set<string>();

  for (const album of albums) {
    if (!isFullAlbum(album) || seenIds.has(album.id)) continue;
    if (
      !isEnglishFriendlyText(
        album.name,
        ...(album.artists?.map((a) => a.name) ?? [])
      )
    ) {
      continue;
    }
    seenIds.add(album.id);
    out.push(album);
  }

  return out;
}

export async function searchMusic(query: string): Promise<UnifiedMediaItem[]> {
  const token = await getSpotifyAccessToken();

  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", query);
  // Albums only — never surface individual tracks
  url.searchParams.set("type", "album");
  url.searchParams.set("limit", "15");
  url.searchParams.set("market", "US");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 120 },
  });

  if (!res.ok) throw new Error(`Spotify request failed: ${res.status}`);

  const data = (await res.json()) as {
    albums?: { items?: SpotifyAlbum[] };
  };

  const candidates = filterAlbumCandidates(data.albums?.items ?? []);
  return dedupeByTitle(candidates).map(toMusicItem);
}

/** Spotify search max `limit` is 10 (Feb 2026); paginate to fill the grid. */
const SEARCH_PAGE_SIZE = 10;

export async function getTrendingMusic(
  limit = 20
): Promise<UnifiedMediaItem[]> {
  const token = await getSpotifyAccessToken();
  const year = new Date().getFullYear();
  const pageCount = Math.max(5, Math.ceil((limit * 2.5) / SEARCH_PAGE_SIZE));
  const offsets = Array.from(
    { length: pageCount },
    (_, index) => index * SEARCH_PAGE_SIZE
  );

  // year:YYYY + US market ranks major popular releases for English-speaking listeners
  // better than tag:new, which skews toward obscure international catalog adds.
  const pages = await Promise.all(
    offsets.map(async (offset) => {
      const url = new URL("https://api.spotify.com/v1/search");
      url.searchParams.set("q", `year:${year}`);
      url.searchParams.set("type", "album");
      url.searchParams.set("limit", String(SEARCH_PAGE_SIZE));
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("market", "US");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 86400 },
      });

      if (!res.ok) {
        throw new Error(`Spotify new albums search failed: ${res.status}`);
      }

      const data = (await res.json()) as {
        albums?: { items?: SpotifyAlbum[] };
      };

      return data.albums?.items ?? [];
    })
  );

  const candidates = filterAlbumCandidates(pages.flat());
  return dedupeByTitle(candidates).slice(0, limit).map(toMusicItem);
}

export async function getPopularMusic(): Promise<UnifiedMediaItem[]> {
  return getTrendingMusic();
}

export async function getNewMusic(): Promise<UnifiedMediaItem[]> {
  const token = await getSpotifyAccessToken();
  const target = 20;

  const pages = await Promise.all(
    [0, 10].map(async (offset) => {
      const url = new URL("https://api.spotify.com/v1/search");
      url.searchParams.set("q", "tag:new");
      url.searchParams.set("type", "album");
      url.searchParams.set("limit", String(SEARCH_PAGE_SIZE));
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("market", "US");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 86400 },
      });

      if (!res.ok) {
        throw new Error(`Spotify new albums failed: ${res.status}`);
      }

      const data = (await res.json()) as {
        albums?: { items?: SpotifyAlbum[] };
      };
      return data.albums?.items ?? [];
    })
  );

  const candidates = filterAlbumCandidates(pages.flat());
  const deduped = await dedupePreferExplicit(candidates, token);
  return deduped.slice(0, target).map(toMusicItem);
}
