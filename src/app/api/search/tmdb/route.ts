import { NextRequest, NextResponse } from "next/server";
import type { MediaItem, SearchResponse } from "@/lib/types";

interface TmdbResult {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
}

interface TmdbMultiResponse {
  results: TmdbResult[];
}

function yearFromDate(date?: string): string {
  if (!date || date.length < 4) return "—";
  return date.slice(0, 4);
}

function posterUrl(path?: string | null): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/w92${path}`;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { results: [], error: "Missing query parameter `q`" } satisfies SearchResponse,
      { status: 400 }
    );
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { results: [], error: "TMDB_API_KEY is not configured" } satisfies SearchResponse,
      { status: 500 }
    );
  }

  try {
    const url = new URL("https://api.themoviedb.org/3/search/multi");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query", query);
    url.searchParams.set("include_adult", "false");
    url.searchParams.set("page", "1");

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });

    if (!res.ok) {
      throw new Error(`TMDB request failed: ${res.status}`);
    }

    const data = (await res.json()) as TmdbMultiResponse;

    const movies: MediaItem[] = [];
    const tv: MediaItem[] = [];

    for (const item of data.results ?? []) {
      if (item.media_type === "movie") {
        movies.push({
          id: String(item.id),
          title: item.title ?? "Untitled",
          creator: "—",
          year: yearFromDate(item.release_date),
          thumbnail: posterUrl(item.poster_path),
          mediaType: "movie",
        });
      } else if (item.media_type === "tv") {
        tv.push({
          id: String(item.id),
          title: item.name ?? "Untitled",
          creator: "—",
          year: yearFromDate(item.first_air_date),
          thumbnail: posterUrl(item.poster_path),
          mediaType: "tv",
        });
      }
    }

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
