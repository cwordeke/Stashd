import { unstable_cache } from "next/cache";
import type { MediaType, UnifiedMediaItem } from "@/lib/types";
import { getTrendingMovies, getTrendingTv } from "@/lib/providers/tmdb";
import { getTrendingGames } from "@/lib/providers/igdb";
import { getTrendingBooks } from "@/lib/providers/openlibrary";
import { getTrendingMusic } from "@/lib/providers/spotify";
import { getPlaceholderResults } from "@/lib/popular";

export type TrendingSource = "live" | "placeholder";

async function fetchTrendingForType(
  type: MediaType
): Promise<{ results: UnifiedMediaItem[]; source: TrendingSource }> {
  try {
    let results: UnifiedMediaItem[] = [];

    switch (type) {
      case "movie":
        results = await getTrendingMovies();
        break;
      case "tv":
        results = await getTrendingTv();
        break;
      case "game":
        results = await getTrendingGames();
        break;
      case "book":
        results = await getTrendingBooks();
        break;
      case "music":
        results = await getTrendingMusic();
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
  async (type: MediaType) => fetchTrendingForType(type),
  ["trending-by-type-v2-creators"],
  { revalidate: 86400 }
);

export async function getTrendingForType(
  type: MediaType
): Promise<{ results: UnifiedMediaItem[]; source: TrendingSource }> {
  return getCachedTrending(type);
}
