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
}

interface SpotifyTrack {
  id: string;
  name: string;
  album?: {
    release_date?: string;
    images?: SpotifyImage[];
  };
  artists?: SpotifyArtist[];
}

/** Non-Latin scripts (Arabic, CJK, Hangul, Cyrillic, Devanagari, Thai, etc.). */
const NON_LATIN_SCRIPT =
  /[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

function isEnglishFriendlyText(...parts: Array<string | undefined>): boolean {
  const text = parts.filter(Boolean).join(" ");
  if (!text.trim()) return false;
  return !NON_LATIN_SCRIPT.test(text);
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

export async function searchMusic(query: string): Promise<UnifiedMediaItem[]> {
  const token = await getSpotifyAccessToken();

  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "album,track");
  url.searchParams.set("limit", "8");
  url.searchParams.set("market", "US");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 120 },
  });

  if (!res.ok) throw new Error(`Spotify request failed: ${res.status}`);

  const data = (await res.json()) as {
    albums?: { items?: SpotifyAlbum[] };
    tracks?: { items?: SpotifyTrack[] };
  };

  const results: UnifiedMediaItem[] = [];

  for (const album of data.albums?.items ?? []) {
    if (
      !isEnglishFriendlyText(
        album.name,
        ...(album.artists?.map((a) => a.name) ?? [])
      )
    ) {
      continue;
    }
    results.push(toMusicItem(album));
  }

  for (const track of data.tracks?.items ?? []) {
    if (
      !isEnglishFriendlyText(
        track.name,
        ...(track.artists?.map((a) => a.name) ?? [])
      )
    ) {
      continue;
    }
    results.push({
      id: `track-${track.id}`,
      title: track.name,
      creator: track.artists?.map((a) => a.name).join(", ") || "—",
      year: yearFromDate(track.album?.release_date),
      thumbnail: spotifyArt(track.album?.images),
      mediaType: "music",
    });
  }

  return results;
}

/** Spotify search max `limit` is 10 (Feb 2026); paginate to fill the grid. */
const TRENDING_MUSIC_TARGET = 20;
const SEARCH_PAGE_SIZE = 10;
/** Parallel page offsets — enough headroom after album-type + Latin-script filters. */
const TRENDING_PAGE_OFFSETS = [0, 10, 20, 30];

export async function getTrendingMusic(): Promise<UnifiedMediaItem[]> {
  const token = await getSpotifyAccessToken();
  const year = new Date().getFullYear();

  // year:YYYY + US market ranks major popular releases for English-speaking listeners
  // better than tag:new, which skews toward obscure international catalog adds.
  const pages = await Promise.all(
    TRENDING_PAGE_OFFSETS.map(async (offset) => {
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

  const candidates: SpotifyAlbum[] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    for (const album of page) {
      if (!album.id || seen.has(album.id)) continue;
      if (
        !isEnglishFriendlyText(
          album.name,
          ...(album.artists?.map((a) => a.name) ?? [])
        )
      ) {
        continue;
      }
      seen.add(album.id);
      candidates.push(album);
    }
  }

  // Prefer full albums (most popular LPs) over singles/EPs; fill remainder if needed.
  const albums = candidates.filter((a) => a.album_type === "album");
  const fillers = candidates.filter((a) => a.album_type !== "album");
  const selected = [...albums, ...fillers].slice(0, TRENDING_MUSIC_TARGET);

  return selected.map(toMusicItem);
}

export async function getPopularMusic(): Promise<UnifiedMediaItem[]> {
  return getTrendingMusic();
}
