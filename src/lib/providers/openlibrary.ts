import { openLibraryCover } from "@/lib/media";
import type { UnifiedMediaItem } from "@/lib/types";

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

function mapDocs(docs: OpenLibraryDoc[]): UnifiedMediaItem[] {
  return docs.map((doc, index) => ({
    id: doc.key ?? `book-${index}`,
    title: doc.title ?? "Untitled",
    creator: doc.author_name?.[0] ?? "—",
    year: doc.first_publish_year ? String(doc.first_publish_year) : "—",
    thumbnail: openLibraryCover(doc.cover_i, "M"),
    mediaType: "book" as const,
  }));
}

export async function searchBooks(query: string): Promise<UnifiedMediaItem[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "10");
  url.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,cover_i"
  );

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Open Library request failed: ${res.status}`);

  const data = (await res.json()) as OpenLibraryResponse;
  return mapDocs(data.docs ?? []);
}

export async function getPopularBooks(): Promise<UnifiedMediaItem[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", "subject:fiction");
  url.searchParams.set("sort", "already_read");
  url.searchParams.set("limit", "12");
  url.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,cover_i"
  );

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Open Library popular failed: ${res.status}`);

  const data = (await res.json()) as OpenLibraryResponse;
  return mapDocs(data.docs ?? []);
}
