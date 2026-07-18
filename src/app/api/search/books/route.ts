import { NextRequest, NextResponse } from "next/server";
import type { MediaItem, SearchResponse } from "@/lib/types";

interface OpenLibraryDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
}

interface OpenLibraryResponse {
  docs?: OpenLibraryDoc[];
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { results: [], error: "Missing query parameter `q`" } satisfies SearchResponse,
      { status: 400 }
    );
  }

  try {
    const url = new URL("https://openlibrary.org/search.json");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "10");
    url.searchParams.set("fields", "key,title,author_name,first_publish_year,cover_i");

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });

    if (!res.ok) {
      throw new Error(`Open Library request failed: ${res.status}`);
    }

    const data = (await res.json()) as OpenLibraryResponse;

    const results: MediaItem[] = (data.docs ?? []).map((doc, index) => ({
      id: doc.key ?? `book-${index}`,
      title: doc.title ?? "Untitled",
      creator: doc.author_name?.[0] ?? "—",
      year: doc.first_publish_year ? String(doc.first_publish_year) : "—",
      thumbnail: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg`
        : null,
      mediaType: "book" as const,
    }));

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
