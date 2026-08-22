import { unstable_cache } from "next/cache";
import type { MediaType, UnifiedMediaItem } from "@/lib/types";
import { getTrendingMovies, getTrendingTv } from "@/lib/providers/tmdb";
import { getTrendingGames } from "@/lib/providers/igdb";
import { getTrendingBooks } from "@/lib/providers/openlibrary";
import { getTrendingMusic } from "@/lib/providers/spotify";
import { getPlaceholderResults } from "@/lib/popular";

export type TrendingSource = "live" | "placeholder";

async function fetchTrendingForType(
  type: MediaType,
  limit: number
): Promise<{ results: UnifiedMediaItem[]; source: TrendingSource }> {
  try {
    let results: UnifiedMediaItem[] = [];

    switch (type) {
      case "movie":
        results = await getTrendingMovies(limit);
        break;
      case "tv":
        results = await getTrendingTv(limit);
        break;
      case "game":
        results = await getTrendingGames(limit);
        break;
      case "book":
        results = await getTrendingBooks(limit);
        break;
      case "music":
        results = await getTrendingMusic(limit);
        break;
    }

    if (!results.length) {
      return { results: getPlaceholderResults(type), source: "placeholder" };
    }

    return { results, source: "live" };
  } catch {
    return { results: getPlaceholderResults(type), source: "placeholder" };
  }
}

const getCachedTrending = unstable_cache(
  async (type: MediaType, limit: number) => fetchTrendingForType(type, limit),
  ["trending-by-type-v4-paged-grid"],
  { revalidate: 86400 }
);

export async function getTrendingForType(
  type: MediaType,
  limit = 20
): Promise<{ results: UnifiedMediaItem[]; source: TrendingSource }> {
  return getCachedTrending(type, limit);
}
