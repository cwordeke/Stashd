import { NextResponse } from "next/server";
import { getTrendingMusic } from "@/lib/providers/spotify";
import { getPlaceholderResults } from "@/lib/popular";

export const revalidate = 86400;

export async function GET() {
  try {
    const results = await getTrendingMusic();
    if (!results.length) {
      return NextResponse.json({
        results: getPlaceholderResults("music"),
        source: "placeholder" as const,
      });
    }
    return NextResponse.json({ results, source: "live" as const });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Trending music failed";
    return NextResponse.json({
      results: getPlaceholderResults("music"),
      source: "placeholder" as const,
      error: message,
    });
  }
}
