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

async function getTmdbTrending(
  mediaType: "movie" | "tv",
  limit: number
): Promise<UnifiedMediaItem[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const pageCount = Math.max(1, Math.ceil(limit / 20));
  const pages = await Promise.all(
    Array.from({ length: pageCount }, async (_, index) => {
      const url = new URL(
        `https://api.themoviedb.org/3/trending/${mediaType}/week`
      );
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("page", String(index + 1));

      const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
      if (!res.ok) {
        throw new Error(`TMDB trending ${mediaType} failed: ${res.status}`);
      }

      return (await res.json()) as TmdbListResponse;
    })
  );

  const seen = new Set<string>();
  const items: UnifiedMediaItem[] = [];

  for (const data of pages) {
    for (const item of data.results ?? []) {
      const id = String(item.id);
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({
        id,
        title:
          (mediaType === "movie" ? item.title : item.name) ?? "Untitled",
        creator: "—",
        year: yearFromDate(
          mediaType === "movie" ? item.release_date : item.first_air_date
        ),
        thumbnail: tmdbPoster(item.poster_path),
        mediaType,
      });
      if (items.length >= limit) break;
    }
    if (items.length >= limit) break;
  }

  return withDetailCreators(items);
}

export async function getTrendingMovies(
  limit = 20
): Promise<UnifiedMediaItem[]> {
  return getTmdbTrending("movie", limit);
}

export async function getTrendingTv(limit = 20): Promise<UnifiedMediaItem[]> {
  return getTmdbTrending("tv", limit);
}

/** Map a TMDB movie payload onto Stashd’s shared media shape. */
export function normalizeTmdbMovie(item: {
  id: number;
  title?: string;
  release_date?: string;
  poster_path?: string | null;
}): UnifiedMediaItem {
  return {
    id: String(item.id),
    title: item.title ?? "Untitled",
    creator: "—",
    year: yearFromDate(item.release_date),
    thumbnail: tmdbPoster(item.poster_path),
    mediaType: "movie",
  };
}

function mapTmdbList(
  results: TmdbListItem[] | undefined,
  mediaType: "movie" | "tv",
  limit = 20
): UnifiedMediaItem[] {
  return (results ?? []).slice(0, limit).map((item) =>
    mediaType === "movie"
      ? normalizeTmdbMovie(item)
      : {
          id: String(item.id),
          title: item.name ?? "Untitled",
          creator: "—",
          year: yearFromDate(item.first_air_date),
          thumbnail: tmdbPoster(item.poster_path),
          mediaType,
        }
  );
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
      movies.push(normalizeTmdbMovie(item));
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

function fourDigitYear(year?: string): string | null {
  if (!year) return null;
  const match = year.trim().match(/^(\d{4})$/);
  return match?.[1] ?? null;
}

async function searchTmdbMovieOnce(
  apiKey: string,
  query: string,
  year: string | null
): Promise<UnifiedMediaItem | null> {
  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("page", "1");
  if (year) url.searchParams.set("year", year);

  let res = await fetch(url.toString(), { cache: "no-store" });
  if (res.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 1100));
    res = await fetch(url.toString(), { cache: "no-store" });
  }
  if (!res.ok) {
    throw new Error(`TMDB search failed: ${res.status}`);
  }

  const data = (await res.json()) as TmdbListResponse;
  const top = data.results?.[0];
  return top ? normalizeTmdbMovie(top) : null;
}

/**
 * Best-effort title/year match for imports. Uses `/search/movie` and the top
 * result only — no per-hit detail fetches (those would trip TMDB rate limits).
 */
export async function searchTmdbMovie(
  query: string,
  year?: string
): Promise<UnifiedMediaItem | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not configured");

  const trimmed = query.trim();
  if (!trimmed) return null;

  const yearParam = fourDigitYear(year);
  const match = await searchTmdbMovieOnce(apiKey, trimmed, yearParam);
  if (match || !yearParam) return match;

  return searchTmdbMovieOnce(apiKey, trimmed, null);
}
