import { NextResponse } from "next/server";
import { getTrendingGames } from "@/lib/providers/igdb";
import { getPlaceholderResults } from "@/lib/popular";

export const revalidate = 86400;

export async function GET() {
  try {
    const results = await getTrendingGames();
    if (!results.length) {
      return NextResponse.json({
        results: getPlaceholderResults("game"),
        source: "placeholder" as const,
      });
    }
    return NextResponse.json({ results, source: "live" as const });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Trending games failed";
    return NextResponse.json({
      results: getPlaceholderResults("game"),
      source: "placeholder" as const,
      error: message,
    });
  }
}
