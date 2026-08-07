import {
  igdbCover,
  igdbScreenshot,
  openLibraryCover,
  spotifyArt,
  spotifyArtLarge,
  tmdbBackdrop,
  tmdbPoster,
  yearFromDate,
  yearFromUnix,
} from "@/lib/media";
import { getTwitchAccessToken, getTwitchClientId } from "@/lib/twitch";
import { getSpotifyAccessToken } from "@/lib/spotify";
import type { MediaDetails, MediaType } from "@/lib/types";
import { isMediaType } from "@/lib/types";

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeDescription(
  value: unknown
): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const cleaned = stripHtml(value);
    return cleaned || null;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof (value as { value: unknown }).value === "string"
  ) {
    const cleaned = stripHtml((value as { value: string }).value);
    return cleaned || null;
  }
  return null;
}

async function getMovieDetails(id: string): Promise<MediaDetails> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const url = new URL(`https://api.themoviedb.org/3/movie/${id}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("append_to_response", "credits");

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`TMDB movie details failed: ${res.status}`);

  const data = (await res.json()) as {
    id: number;
    title?: string;
    overview?: string;
    tagline?: string;
    release_date?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    credits?: {
      crew?: Array<{ job?: string; name?: string }>;
    };
  };

  const director =
    data.credits?.crew?.find((c) => c.job === "Director")?.name ?? "—";

  return {
    id: String(data.id),
    title: data.title ?? "Untitled",
    creator: director,
    year: yearFromDate(data.release_date),
    thumbnail: tmdbPoster(data.poster_path, "w500"),
    mediaType: "movie",
    description: data.overview?.trim() || null,
    backdropUrl: tmdbBackdrop(data.backdrop_path),
    tagline: data.tagline?.trim() || null,
  };
}

async function getTvDetails(id: string): Promise<MediaDetails> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const url = new URL(`https://api.themoviedb.org/3/tv/${id}`);
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`TMDB TV details failed: ${res.status}`);

  const data = (await res.json()) as {
    id: number;
    name?: string;
    overview?: string;
    tagline?: string;
    first_air_date?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    created_by?: Array<{ name?: string }>;
  };

  return {
    id: String(data.id),
    title: data.name ?? "Untitled",
    creator: data.created_by?.[0]?.name ?? "—",
    year: yearFromDate(data.first_air_date),
    thumbnail: tmdbPoster(data.poster_path, "w500"),
    mediaType: "tv",
    description: data.overview?.trim() || null,
    backdropUrl: tmdbBackdrop(data.backdrop_path),
    tagline: data.tagline?.trim() || null,
  };
}

async function getGameDetails(id: string): Promise<MediaDetails> {
  const token = await getTwitchAccessToken();
  const clientId = getTwitchClientId();
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid game id");
  }

  const body = [
    `where id = ${numericId};`,
    "fields name,summary,first_release_date,cover.url,screenshots.url,involved_companies.developer,involved_companies.publisher,involved_companies.company.name;",
    "limit 1;",
  ].join(" ");

  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "text/plain",
    },
    body,
    next: { revalidate: 86400 },
  });

  if (!res.ok) throw new Error(`IGDB game details failed: ${res.status}`);

  const data = (await res.json()) as Array<{
    id: number;
    name?: string;
    summary?: string;
    first_release_date?: number;
    cover?: { url?: string };
    screenshots?: Array<{ url?: string }>;
    involved_companies?: Array<{
      developer?: boolean;
      publisher?: boolean;
      company?: { name?: string };
    }>;
  }>;

  const game = data[0];
  if (!game) throw new Error("Game not found");

  const companies = game.involved_companies ?? [];
  const developer = companies.find((c) => c.developer)?.company?.name;
  const publisher = companies.find((c) => c.publisher)?.company?.name;
  const creator = developer ?? publisher ?? companies[0]?.company?.name ?? "—";

  return {
    id: String(game.id),
    title: game.name ?? "Untitled",
    creator,
    year: yearFromUnix(game.first_release_date),
    thumbnail: igdbCover(game.cover?.url),
    mediaType: "game",
    description: game.summary?.trim() || null,
    backdropUrl: igdbScreenshot(game.screenshots?.[0]?.url),
    tagline: null,
  };
}

async function getBookDetails(id: string): Promise<MediaDetails> {
  const key = id.startsWith("/") ? id : `/${id}`;
  const workUrl = `https://openlibrary.org${key}.json`;

  const res = await fetch(workUrl, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Open Library details failed: ${res.status}`);

  const data = (await res.json()) as {
    key?: string;
    title?: string;
    description?: unknown;
    covers?: number[];
    first_publish_date?: string;
    authors?: Array<{ author?: { key?: string } }>;
  };

  let creator = "—";
  const authorKey = data.authors?.[0]?.author?.key;
  if (authorKey) {
    try {
      const authorRes = await fetch(
        `https://openlibrary.org${authorKey}.json`,
        { next: { revalidate: 86400 } }
      );
      if (authorRes.ok) {
        const author = (await authorRes.json()) as { name?: string };
        creator = author.name ?? "—";
      }
    } catch {
      // keep fallback creator
    }
  }

  const coverId = data.covers?.[0];

  return {
    id: data.key ?? key,
    title: data.title ?? "Untitled",
    creator,
    year: yearFromDate(data.first_publish_date),
    thumbnail: openLibraryCover(coverId, "L"),
    mediaType: "book",
    description: normalizeDescription(data.description),
    backdropUrl: null,
    tagline: null,
  };
}

async function getMusicDetails(id: string): Promise<MediaDetails> {
  const token = await getSpotifyAccessToken();

  if (id.startsWith("album-")) {
    const albumId = id.replace(/^album-/, "");
    const res = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error(`Spotify album details failed: ${res.status}`);

    const album = (await res.json()) as {
      id: string;
      name: string;
      release_date?: string;
      images?: Array<{ url: string; width?: number }>;
      artists?: Array<{ name: string }>;
      label?: string;
      album_type?: string;
      total_tracks?: number;
    };

    const art = spotifyArtLarge(album.images) ?? spotifyArt(album.images);
    const bits = [
      album.album_type ? `${album.album_type}` : null,
      album.total_tracks ? `${album.total_tracks} tracks` : null,
      album.label ? `Label: ${album.label}` : null,
    ].filter(Boolean);

    return {
      id: `album-${album.id}`,
      title: album.name,
      creator: album.artists?.map((a) => a.name).join(", ") || "—",
      year: yearFromDate(album.release_date),
      thumbnail: art,
      mediaType: "music",
      description: bits.length ? bits.join(" · ") : null,
      backdropUrl: null,
      tagline: null,
    };
  }

  const trackId = id.replace(/^track-/, "");
  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`Spotify track details failed: ${res.status}`);

  const track = (await res.json()) as {
    id: string;
    name: string;
    artists?: Array<{ name: string }>;
    album?: {
      name?: string;
      release_date?: string;
      images?: Array<{ url: string; width?: number }>;
    };
  };

  const art =
    spotifyArtLarge(track.album?.images) ?? spotifyArt(track.album?.images);

  return {
    id: `track-${track.id}`,
    title: track.name,
    creator: track.artists?.map((a) => a.name).join(", ") || "—",
    year: yearFromDate(track.album?.release_date),
    thumbnail: art,
    mediaType: "music",
    description: track.album?.name
      ? `From the album “${track.album.name}”`
      : null,
    backdropUrl: null,
    tagline: null,
  };
}

export async function getMediaDetails(
  mediaType: string,
  id: string
): Promise<MediaDetails> {
  if (!isMediaType(mediaType)) {
    throw new Error("Invalid media type");
  }

  const decodedId = decodeURIComponent(id);

  switch (mediaType as MediaType) {
    case "movie":
      return getMovieDetails(decodedId);
    case "tv":
      return getTvDetails(decodedId);
    case "game":
      return getGameDetails(decodedId);
    case "book":
      return getBookDetails(decodedId);
    case "music":
      return getMusicDetails(decodedId);
  }
}
