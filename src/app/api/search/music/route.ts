import { NextRequest, NextResponse } from "next/server";
import { getSpotifyAccessToken } from "@/lib/spotify";
import type { MediaItem, SearchResponse } from "@/lib/types";

interface SpotifyImage {
  url: string;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyAlbum {
  id: string;
  name: string;
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

interface SpotifySearchResponse {
  albums?: { items?: SpotifyAlbum[] };
  tracks?: { items?: SpotifyTrack[] };
}

function yearFromDate(date?: string): string {
  if (!date || date.length < 4) return "—";
  return date.slice(0, 4);
}

function smallestImage(images?: SpotifyImage[]): string | null {
  if (!images?.length) return null;
  return images[images.length - 1]?.url ?? null;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { results: [], error: "Missing query parameter `q`" } satisfies SearchResponse,
      { status: 400 }
    );
  }

  try {
    const token = await getSpotifyAccessToken();

    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", query);
    url.searchParams.set("type", "album,track");
    url.searchParams.set("limit", "8");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Spotify request failed: ${res.status}`);
    }

    const data = (await res.json()) as SpotifySearchResponse;
    const results: MediaItem[] = [];

    for (const album of data.albums?.items ?? []) {
      results.push({
        id: `album-${album.id}`,
        title: album.name,
        creator: album.artists?.map((a) => a.name).join(", ") || "—",
        year: yearFromDate(album.release_date),
        thumbnail: smallestImage(album.images),
        mediaType: "music",
      });
    }

    for (const track of data.tracks?.items ?? []) {
      results.push({
        id: `track-${track.id}`,
        title: track.name,
        creator: track.artists?.map((a) => a.name).join(", ") || "—",
        year: yearFromDate(track.album?.release_date),
        thumbnail: smallestImage(track.album?.images),
        mediaType: "music",
      });
    }

    return NextResponse.json({ results } satisfies SearchResponse);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Spotify search failed";
    return NextResponse.json(
      { results: [], error: message } satisfies SearchResponse,
      { status: 502 }
    );
  }
}
