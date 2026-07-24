import { NextRequest, NextResponse } from "next/server";
import { searchTmdb } from "@/lib/providers/tmdb";
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
    const { movies, tv } = await searchTmdb(query);
    return NextResponse.json({
      movies,
      tv,
      results: [...movies, ...tv],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TMDB search failed";
    return NextResponse.json(
      { results: [], movies: [], tv: [], error: message },
      { status: 502 }
    );
  }
}
