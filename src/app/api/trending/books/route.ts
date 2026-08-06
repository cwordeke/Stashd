import { NextResponse } from "next/server";
import { getTrendingBooks } from "@/lib/providers/openlibrary";
import { getPlaceholderResults } from "@/lib/popular";

export const revalidate = 86400;

export async function GET() {
  try {
    const results = await getTrendingBooks();
    if (!results.length) {
      return NextResponse.json({
        results: getPlaceholderResults("book"),
        source: "placeholder" as const,
      });
    }
    return NextResponse.json({ results, source: "live" as const });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Trending books failed";
    return NextResponse.json({
      results: getPlaceholderResults("book"),
      source: "placeholder" as const,
      error: message,
    });
  }
}
