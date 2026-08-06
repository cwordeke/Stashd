import { NextResponse } from "next/server";
import { getTrendingMovies } from "@/lib/providers/tmdb";
import { getPlaceholderResults } from "@/lib/popular";

export const revalidate = 86400;

export async function GET() {
  try {
    const results = await getTrendingMovies();
    if (!results.length) {
      return NextResponse.json({
        results: getPlaceholderResults("movie"),
        source: "placeholder" as const,
      });
    }
    return NextResponse.json({ results, source: "live" as const });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Trending movies failed";
    return NextResponse.json({
      results: getPlaceholderResults("movie"),
      source: "placeholder" as const,
      error: message,
    });
  }
}
