import { NextRequest, NextResponse } from "next/server";
import { searchBooks } from "@/lib/providers/openlibrary";
import type { SearchResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { results: [], error: "Missing query parameter `q`" } satisfies SearchResponse,
      { status: 400 }
    );
  }

  try {
    const results = await searchBooks(query);
    return NextResponse.json({ results } satisfies SearchResponse);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Open Library search failed";
    return NextResponse.json(
      { results: [], error: message } satisfies SearchResponse,
      { status: 502 }
    );
  }
}
