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

export async function getTrendingMovies(): Promise<UnifiedMediaItem[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const url = new URL("https://api.themoviedb.org/3/trending/movie/week");
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`TMDB trending movies failed: ${res.status}`);

  const data = (await res.json()) as TmdbListResponse;
  return (data.results ?? []).slice(0, 20).map((item) => ({
    id: String(item.id),
    title: item.title ?? "Untitled",
    creator: "—",
    year: yearFromDate(item.release_date),
    thumbnail: tmdbPoster(item.poster_path),
    mediaType: "movie" as const,
  }));
}

export async function getTrendingTv(): Promise<UnifiedMediaItem[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const url = new URL("https://api.themoviedb.org/3/trending/tv/week");
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`TMDB trending TV failed: ${res.status}`);

  const data = (await res.json()) as TmdbListResponse;
  return (data.results ?? []).slice(0, 20).map((item) => ({
    id: String(item.id),
    title: item.name ?? "Untitled",
    creator: "—",
    year: yearFromDate(item.first_air_date),
    thumbnail: tmdbPoster(item.poster_path),
    mediaType: "tv" as const,
  }));
}

export async function getPopularMovies(): Promise<UnifiedMediaItem[]> {
  return getTrendingMovies();
}

export async function getPopularTv(): Promise<UnifiedMediaItem[]> {
  return getTrendingTv();
}

export async function searchTmdb(query: string) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const url = new URL("https://api.themoviedb.org/3/search/multi");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), { next: { revalidate: 120 } });
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
