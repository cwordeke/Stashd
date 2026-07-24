import { tmdbPoster, yearFromDate } from "@/lib/media";
import type { UnifiedMediaItem } from "@/lib/types";

interface TmdbListItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
}

interface TmdbListResponse {
  results?: TmdbListItem[];
}

export async function getPopularMovies(): Promise<UnifiedMediaItem[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const url = new URL("https://api.themoviedb.org/3/movie/popular");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB popular movies failed: ${res.status}`);

  const data = (await res.json()) as TmdbListResponse;
  return (data.results ?? []).slice(0, 12).map((item) => ({
    id: String(item.id),
    title: item.title ?? "Untitled",
    creator: "—",
    year: yearFromDate(item.release_date),
    thumbnail: tmdbPoster(item.poster_path),
    mediaType: "movie" as const,
  }));
}

export async function getPopularTv(): Promise<UnifiedMediaItem[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const url = new URL("https://api.themoviedb.org/3/tv/popular");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB popular TV failed: ${res.status}`);

  const data = (await res.json()) as TmdbListResponse;
  return (data.results ?? []).slice(0, 12).map((item) => ({
    id: String(item.id),
    title: item.name ?? "Untitled",
    creator: "—",
    year: yearFromDate(item.first_air_date),
    thumbnail: tmdbPoster(item.poster_path),
    mediaType: "tv" as const,
  }));
}

export async function searchTmdb(query: string) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const url = new URL("https://api.themoviedb.org/3/search/multi");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`TMDB request failed: ${res.status}`);

  const data = (await res.json()) as {
    results?: Array<{
      id: number;
      media_type: string;
      title?: string;
      name?: string;
      release_date?: string;
      first_air_date?: string;
      poster_path?: string | null;
    }>;
  };

  const movies: UnifiedMediaItem[] = [];
  const tv: UnifiedMediaItem[] = [];

  for (const item of data.results ?? []) {
    if (item.media_type === "movie") {
      movies.push({
        id: String(item.id),
        title: item.title ?? "Untitled",
        creator: "—",
        year: yearFromDate(item.release_date),
        thumbnail: tmdbPoster(item.poster_path),
        mediaType: "movie",
      });
    } else if (item.media_type === "tv") {
      tv.push({
        id: String(item.id),
        title: item.name ?? "Untitled",
        creator: "—",
        year: yearFromDate(item.first_air_date),
        thumbnail: tmdbPoster(item.poster_path),
        mediaType: "tv",
      });
    }
  }

  return { movies, tv };
}
