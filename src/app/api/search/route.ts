import { NextRequest, NextResponse } from "next/server";
import { withTimeout } from "@/lib/with-timeout";
import { searchBooks } from "@/lib/providers/openlibrary";
import { searchGames } from "@/lib/providers/igdb";
import { searchMusic } from "@/lib/providers/spotify";
import { searchTmdb } from "@/lib/providers/tmdb";
import { isMediaType, type MediaType, type UnifiedMediaItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const PROVIDER_TIMEOUT_MS = 2500;

type ProviderKey = "tmdb" | "game" | "book" | "music";

function sliceLimit(items: UnifiedMediaItem[], limit: number | null) {
  if (limit == null || limit <= 0) return items;
  return items.slice(0, limit);
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const typeParam = request.nextUrl.searchParams.get("type");
  const filterType: MediaType | null =
    typeParam && isMediaType(typeParam) ? typeParam : null;
  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : null;
  const perProvider =
    limit != null && Number.isFinite(limit) && limit > 0
      ? Math.max(3, Math.ceil(limit / (filterType ? 1 : 3)))
      : null;

  if (!query) {
    return NextResponse.json(
      { results: [], error: "Missing query parameter `q`" },
      { status: 400 }
    );
  }

  const want = (type: MediaType) => !filterType || filterType === type;
  const wantTmdb = want("movie") || want("tv");

  const errors: Partial<Record<MediaType, string>> = {};

  const tasks: Partial<Record<ProviderKey, Promise<void>>> = {};

  let movies: UnifiedMediaItem[] = [];
  let tv: UnifiedMediaItem[] = [];
  let game: UnifiedMediaItem[] = [];
  let book: UnifiedMediaItem[] = [];
  let music: UnifiedMediaItem[] = [];

  if (wantTmdb) {
    tasks.tmdb = (async () => {
      try {
        const result = await withTimeout(
          searchTmdb(query),
          PROVIDER_TIMEOUT_MS,
          { movies: [] as UnifiedMediaItem[], tv: [] as UnifiedMediaItem[] }
        );
        movies = want("movie") ? sliceLimit(result.movies, perProvider) : [];
        tv = want("tv") ? sliceLimit(result.tv, perProvider) : [];
      } catch (err) {
        const msg = err instanceof Error ? err.message : "TMDB search failed";
        if (want("movie")) errors.movie = msg;
        if (want("tv")) errors.tv = msg;
      }
    })();
  }

  if (want("game")) {
    tasks.game = (async () => {
      try {
        const results = await withTimeout(
          searchGames(query),
          PROVIDER_TIMEOUT_MS,
          [] as UnifiedMediaItem[]
        );
        game = sliceLimit(results, perProvider);
      } catch (err) {
        errors.game =
          err instanceof Error ? err.message : "IGDB search failed";
      }
    })();
  }

  if (want("book")) {
    tasks.book = (async () => {
      try {
        const results = await withTimeout(
          searchBooks(query),
          PROVIDER_TIMEOUT_MS,
          [] as UnifiedMediaItem[]
        );
        book = sliceLimit(results, perProvider);
      } catch (err) {
        errors.book =
          err instanceof Error ? err.message : "Open Library search failed";
      }
    })();
  }

  if (want("music")) {
    tasks.music = (async () => {
      try {
        const results = await withTimeout(
          searchMusic(query),
          PROVIDER_TIMEOUT_MS,
          [] as UnifiedMediaItem[]
        );
        music = sliceLimit(results, perProvider);
      } catch (err) {
        errors.music =
          err instanceof Error ? err.message : "Spotify search failed";
      }
    })();
  }

  await Promise.all(Object.values(tasks));

  const results = [...movies, ...tv, ...game, ...book, ...music];

  return NextResponse.json({
    movies,
    tv,
    game,
    book,
    music,
    results,
    errors: Object.keys(errors).length ? errors : undefined,
  });
}
