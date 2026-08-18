import { tmdbPoster, yearFromDate } from "@/lib/media";
import { getMediaDetails } from "@/lib/providers/details";
import { isoDate, recentReleaseWindow } from "@/lib/release-window";
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

/** Same creator string the detail page shows (“Directed by …”). */
async function withDetailCreators(
  items: UnifiedMediaItem[]
): Promise<UnifiedMediaItem[]> {
  return Promise.all(
    items.map(async (item) => {
      try {
        const details = await getMediaDetails(item.mediaType, item.id);
        return { ...item, creator: details.creator };
      } catch {
        return item;
      }
    })
  );
}

export async function getTrendingMovies(): Promise<UnifiedMediaItem[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const url = new URL("https://api.themoviedb.org/3/trending/movie/week");
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`TMDB trending movies failed: ${res.status}`);

  const data = (await res.json()) as TmdbListResponse;
  const items = (data.results ?? []).slice(0, 20).map((item) => ({
    id: String(item.id),
    title: item.title ?? "Untitled",
    creator: "—",
    year: yearFromDate(item.release_date),
    thumbnail: tmdbPoster(item.poster_path),
    mediaType: "movie" as const,
  }));

  return withDetailCreators(items);
}

export async function getTrendingTv(): Promise<UnifiedMediaItem[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const url = new URL("https://api.themoviedb.org/3/trending/tv/week");
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`TMDB trending TV failed: ${res.status}`);

  const data = (await res.json()) as TmdbListResponse;
  const items = (data.results ?? []).slice(0, 20).map((item) => ({
    id: String(item.id),
    title: item.name ?? "Untitled",
    creator: "—",
    year: yearFromDate(item.first_air_date),
    thumbnail: tmdbPoster(item.poster_path),
    mediaType: "tv" as const,
  }));

  return withDetailCreators(items);
}

function mapTmdbList(
  results: TmdbListItem[] | undefined,
  mediaType: "movie" | "tv",
  limit = 20
): UnifiedMediaItem[] {
  return (results ?? []).slice(0, limit).map((item) => ({
    id: String(item.id),
    title: (mediaType === "movie" ? item.title : item.name) ?? "Untitled",
    creator: "—",
    year: yearFromDate(
      mediaType === "movie" ? item.release_date : item.first_air_date
    ),
    thumbnail: tmdbPoster(item.poster_path),
    mediaType,
  }));
}

async function discoverTmdb(
  path: "movie" | "tv",
  dateParams: Record<string, string>
): Promise<UnifiedMediaItem[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const url = new URL(`https://api.themoviedb.org/3/discover/${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("sort_by", "popularity.desc");
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("page", "1");
  for (const [key, value] of Object.entries(dateParams)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) {
    throw new Error(`TMDB discover ${path} failed: ${res.status}`);
  }

  const data = (await res.json()) as TmdbListResponse;
  return mapTmdbList(data.results, path);
}

export async function getTmdbRecommendations(
  mediaType: "movie" | "tv",
  id: string
): Promise<UnifiedMediaItem[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const url = new URL(
    `https://api.themoviedb.org/3/${mediaType}/${encodeURIComponent(id)}/recommendations`
  );
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) return [];

  const data = (await res.json()) as TmdbListResponse;
  return mapTmdbList(data.results, mediaType, 10);
}

/** Recent theatrical releases, ranked by TMDB popularity. */
export async function getPopularNewMovies(): Promise<UnifiedMediaItem[]> {
  const { from, to } = recentReleaseWindow(3);
  return discoverTmdb("movie", {
    "primary_release_date.gte": isoDate(from),
    "primary_release_date.lte": isoDate(to),
  });
}

/** Recent TV premieres, ranked by TMDB popularity. */
export async function getPopularNewTv(): Promise<UnifiedMediaItem[]> {
  const { from, to } = recentReleaseWindow(3);
  return discoverTmdb("tv", {
    "first_air_date.gte": isoDate(from),
    "first_air_date.lte": isoDate(to),
  });
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

  const [enrichedMovies, enrichedTv] = await Promise.all([
    withDetailCreators(movies),
    withDetailCreators(tv),
  ]);

  return { movies: enrichedMovies, tv: enrichedTv };
}
