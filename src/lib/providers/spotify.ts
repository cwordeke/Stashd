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

export async function searchMusic(query: string): Promise<UnifiedMediaItem[]> {
  const token = await getSpotifyAccessToken();

  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "album,track");
  url.searchParams.set("limit", "8");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });

  if (!res.ok) throw new Error(`Spotify request failed: ${res.status}`);

  const data = (await res.json()) as {
    albums?: { items?: SpotifyAlbum[] };
    tracks?: { items?: SpotifyTrack[] };
  };

  const results: UnifiedMediaItem[] = [];

  for (const album of data.albums?.items ?? []) {
    results.push({
      id: `album-${album.id}`,
      title: album.name,
      creator: album.artists?.map((a) => a.name).join(", ") || "—",
      year: yearFromDate(album.release_date),
      thumbnail: spotifyArt(album.images),
      mediaType: "music",
    });
  }

  for (const track of data.tracks?.items ?? []) {
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

export async function getPopularMusic(): Promise<UnifiedMediaItem[]> {
  const token = await getSpotifyAccessToken();

  const res = await fetch(
    "https://api.spotify.com/v1/browse/new-releases?limit=12&market=US",
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) throw new Error(`Spotify new releases failed: ${res.status}`);

  const data = (await res.json()) as {
    albums?: { items?: SpotifyAlbum[] };
  };

  return (data.albums?.items ?? []).map((album) => ({
    id: `album-${album.id}`,
    title: album.name,
    creator: album.artists?.map((a) => a.name).join(", ") || "—",
    year: yearFromDate(album.release_date),
    thumbnail: spotifyArt(album.images),
    mediaType: "music" as const,
  }));
}
