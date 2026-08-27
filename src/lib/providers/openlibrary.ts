import { openLibraryCover } from "@/lib/media";
import { openLibraryWorkId } from "@/lib/openlibrary-id";
import type { UnifiedMediaItem } from "@/lib/types";

const OPEN_LIBRARY_TIMEOUT_MS = 15_000;
const OPEN_LIBRARY_USER_AGENT = "Stashd/1.0 (+https://github.com/stashd)";

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

interface OpenLibraryTrendingWork {
  key?: string;
  title?: string;
  author_name?: string[];
  author_names?: string[];
  first_publish_year?: number;
  cover_i?: number;
}

interface OpenLibraryTrendingResponse {
  works?: OpenLibraryTrendingWork[];
  docs?: OpenLibraryDoc[];
}

async function openLibraryFetch(
  url: string,
  revalidate = 86400
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPEN_LIBRARY_TIMEOUT_MS);

  try {
    return await fetch(url, {
      next: { revalidate },
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": OPEN_LIBRARY_USER_AGENT,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function mapDocs(docs: OpenLibraryDoc[]): UnifiedMediaItem[] {
  const items: UnifiedMediaItem[] = [];

  for (const [index, doc] of docs.entries()) {
    const id = openLibraryWorkId(doc.key) || `works/book-${index}`;
    if (!id || id.startsWith("ph-")) continue;

    items.push({
      id,
      title: doc.title ?? "Untitled",
      creator: doc.author_name?.[0] ?? "—",
      year: doc.first_publish_year ? String(doc.first_publish_year) : "—",
      thumbnail: openLibraryCover(doc.cover_i, "M"),
      mediaType: "book",
    });
  }

  return items;
}

export async function searchBooks(query: string): Promise<UnifiedMediaItem[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "10");
  url.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,cover_i"
  );

  const res = await openLibraryFetch(url.toString(), 120);
  if (!res.ok) throw new Error(`Open Library request failed: ${res.status}`);

  const data = (await res.json()) as OpenLibraryResponse;
  return mapDocs(data.docs ?? []);
}

async function fetchTrendingWeekly(limit: number): Promise<UnifiedMediaItem[]> {
  const res = await openLibraryFetch(
    "https://openlibrary.org/trending/weekly.json"
  );

  if (!res.ok) {
    throw new Error(`Open Library trending failed: ${res.status}`);
  }

  const data = (await res.json()) as OpenLibraryTrendingResponse;
  const works = data.works ?? [];

  if (!works.length) return [];

  return works
    .slice(0, limit)
    .map((work, index) => {
      const id = openLibraryWorkId(work.key) || `works/book-${index}`;
      return {
        id,
        title: work.title ?? "Untitled",
        creator: work.author_name?.[0] ?? work.author_names?.[0] ?? "—",
        year: work.first_publish_year ? String(work.first_publish_year) : "—",
        thumbnail: openLibraryCover(work.cover_i, "M"),
        mediaType: "book" as const,
      };
    })
    .filter((item) => Boolean(item.id) && !item.id.startsWith("ph-"));
}

export async function getPopularBooks(
  limit = 20
): Promise<UnifiedMediaItem[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", "subject:fiction");
  url.searchParams.set("sort", "already_read");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,cover_i"
  );

  const res = await openLibraryFetch(url.toString());
  if (!res.ok) throw new Error(`Open Library popular failed: ${res.status}`);

  const data = (await res.json()) as OpenLibraryResponse;
  return mapDocs(data.docs ?? []);
}

export async function getTrendingBooks(
  limit = 20
): Promise<UnifiedMediaItem[]> {
  const sources = [
    () => getPopularBooks(limit),
    () => fetchTrendingWeekly(limit),
    async () => {
      const results = await searchBooks("bestseller fiction");
      return results.slice(0, limit);
    },
  ];

  for (const source of sources) {
    try {
      const results = await source();
      if (results.length >= Math.min(6, limit)) {
        return results.slice(0, limit);
      }
    } catch (error) {
      console.warn(
        "[getTrendingBooks]",
        error instanceof Error ? error.message : error
      );
    }
  }

  return [];
}

export async function getNewBooks(): Promise<UnifiedMediaItem[]> {
  const year = new Date().getFullYear();
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", `language:eng first_publish_year:${year}`);
  url.searchParams.set("sort", "already_read");
  url.searchParams.set("limit", "20");
  url.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,cover_i"
  );

  const res = await openLibraryFetch(url.toString());
  if (!res.ok) throw new Error(`Open Library new books failed: ${res.status}`);

  const data = (await res.json()) as OpenLibraryResponse;
  return mapDocs(data.docs ?? []);
}
