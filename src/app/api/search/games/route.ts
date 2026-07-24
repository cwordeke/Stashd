import { NextRequest, NextResponse } from "next/server";
import { searchGames } from "@/lib/providers/igdb";
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
    const results = await searchGames(query);
    return NextResponse.json({ results } satisfies SearchResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "IGDB search failed";
    return NextResponse.json(
      { results: [], error: message } satisfies SearchResponse,
      { status: 502 }
    );
  }
}
