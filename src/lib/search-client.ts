import {
  MEDIA_TYPES,
  type ColumnState,
  type MediaType,
  type SearchResponse,
  type UnifiedMediaItem,
} from "@/lib/types";

export type SearchColumns = Record<MediaType, ColumnState>;

/** Independent API sources (TMDB covers movie + tv). */
export type SearchSource = "tmdb" | "game" | "book" | "music";

export const ALL_SEARCH_SOURCES: SearchSource[] = [
  "tmdb",
  "game",
  "book",
  "music",
];

export function emptyColumn(): ColumnState {
  return { loading: false, results: [], error: null };
}

export function emptySearchColumns(): SearchColumns {
  return {
    movie: emptyColumn(),
    tv: emptyColumn(),
    game: emptyColumn(),
    book: emptyColumn(),
    music: emptyColumn(),
  };
}

export interface SearchAllOptions {
  filterType?: MediaType | null;
  /** Cap results per provider (typeahead). */
  limit?: number;
  signal?: AbortSignal;
}

interface UnifiedSearchPayload {
  movies?: UnifiedMediaItem[];
  tv?: UnifiedMediaItem[];
  game?: UnifiedMediaItem[];
  book?: UnifiedMediaItem[];
  music?: UnifiedMediaItem[];
  results?: UnifiedMediaItem[];
  error?: string;
  errors?: Partial<Record<MediaType, string>>;
}

interface TmdbSplitResponse {
  movies?: UnifiedMediaItem[];
  tv?: UnifiedMediaItem[];
  error?: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Higher = more relevant. Exact / prefix title matches beat fuzzy or creator-only hits. */
export function scoreRelevance(query: string, item: UnifiedMediaItem): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const title = item.title.toLowerCase().trim();
  const creator = (item.creator === "—" ? "" : item.creator)
    .toLowerCase()
    .trim();

  if (title === q) return 1000;
  if (
    title.startsWith(`${q} `) ||
    title.startsWith(`${q}:`) ||
    title.startsWith(`${q}-`) ||
    title.startsWith(`${q}'`)
  ) {
    return 920;
  }
  if (title.startsWith(q)) return 880;

  const wordRe = new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escapeRegex(q)}(?:$|[^\\p{L}\\p{N}])`,
    "iu"
  );
  if (wordRe.test(item.title)) return 750;
  if (title.includes(q)) return 520;

  if (creator === q) return 420;
  if (creator.startsWith(q)) return 360;
  if (wordRe.test(item.creator) || creator.includes(q)) return 240;

  return 40;
}

export function rankByRelevance(
  query: string,
  items: UnifiedMediaItem[]
): UnifiedMediaItem[] {
  return items
    .map((item, index) => ({
      item,
      score: scoreRelevance(query, item),
      index,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}

function columnsFromPayload(
  data: UnifiedSearchPayload,
  filterType: MediaType | null
): SearchColumns {
  const columns = emptySearchColumns();
  const errors = data.errors ?? {};

  const assign = (type: MediaType, results: UnifiedMediaItem[] | undefined) => {
    if (filterType && filterType !== type) return;
    columns[type] = {
      loading: false,
      results: results ?? [],
      error: errors[type] ?? null,
    };
  };

  assign("movie", data.movies);
  assign("tv", data.tv);
  assign("game", data.game);
  assign("book", data.book);
  assign("music", data.music);

  return columns;
}

async function fetchColumn(
  url: string,
  signal?: AbortSignal
): Promise<{ results: UnifiedMediaItem[]; error: string | null }> {
  try {
    const res = await fetch(url, { signal });
    const data = (await res.json()) as SearchResponse;

    if (!res.ok || data.error) {
      return {
        results: [],
        error: data.error ?? `Request failed (${res.status})`,
      };
    }

    return { results: data.results ?? [], error: null };
  } catch (err) {
    if (signal?.aborted) {
      return { results: [], error: null };
    }
    return {
      results: [],
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

function snapshot(columns: SearchColumns): SearchColumns {
  return {
    movie: { ...columns.movie },
    tv: { ...columns.tv },
    game: { ...columns.game },
    book: { ...columns.book },
    music: { ...columns.music },
  };
}

/**
 * Sources to query for a filter.
 * All → every provider (parallel). A specific type → only that provider (fast).
 */
export function sourcesForFilter(filterType: MediaType | null): SearchSource[] {
  if (!filterType) return [...ALL_SEARCH_SOURCES];
  if (filterType === "movie" || filterType === "tv") return ["tmdb"];
  return [filterType];
}

export function sourceForFilter(filterType: MediaType | null): SearchSource {
  return sourcesForFilter(filterType)[0];
}

export function mediaTypesForSource(source: SearchSource): MediaType[] {
  if (source === "tmdb") return ["movie", "tv"];
  return [source];
}

/** Single round-trip search across providers (used by typeahead). */
export async function searchAllMedia(
  query: string,
  options: SearchAllOptions = {}
): Promise<SearchColumns> {
  const trimmed = query.trim();
  if (!trimmed) {
    return emptySearchColumns();
  }

  const { filterType = null, limit, signal } = options;
  const params = new URLSearchParams({ q: trimmed });
  if (filterType) params.set("type", filterType);
  if (limit != null) params.set("limit", String(limit));

  try {
    const res = await fetch(`/api/search?${params}`, { signal });
    const data = (await res.json()) as UnifiedSearchPayload & SearchResponse;

    if (!res.ok && data.error && !data.movies && !data.tv) {
      const columns = emptySearchColumns();
      const msg = data.error;
      for (const type of MEDIA_TYPES) {
        if (!filterType || filterType === type) {
          columns[type] = { loading: false, results: [], error: msg };
        }
      }
      return columns;
    }

    return columnsFromPayload(data, filterType);
  } catch (err) {
    if (signal?.aborted) {
      return emptySearchColumns();
    }
    const msg = err instanceof Error ? err.message : "Network error";
    const columns = emptySearchColumns();
    for (const type of MEDIA_TYPES) {
      if (!filterType || filterType === type) {
        columns[type] = { loading: false, results: [], error: msg };
      }
    }
    return columns;
  }
}

/**
 * Fetch only the given sources and merge into `base` columns.
 * Callers choose which sources (All → all in parallel; Books → books only).
 */
export async function fetchSearchSources(
  query: string,
  sources: SearchSource[],
  options: {
    signal?: AbortSignal;
    base?: SearchColumns;
    onUpdate?: (columns: SearchColumns) => void;
  } = {}
): Promise<SearchColumns> {
  const trimmed = query.trim();
  const { signal, onUpdate } = options;
  const columns = snapshot(options.base ?? emptySearchColumns());

  if (!trimmed || sources.length === 0) {
    onUpdate?.(columns);
    return columns;
  }

  const q = encodeURIComponent(trimmed);
  const unique = [...new Set(sources)];

  for (const source of unique) {
    for (const type of mediaTypesForSource(source)) {
      columns[type] = {
        loading: true,
        results: columns[type].results,
        error: null,
      };
    }
  }
  onUpdate?.(snapshot(columns));

  const emit = () => onUpdate?.(snapshot(columns));

  const tasks = unique.map(async (source) => {
    if (source === "tmdb") {
      try {
        const res = await fetch(`/api/search/tmdb?q=${q}`, { signal });
        const data = (await res.json()) as TmdbSplitResponse;

        if (!res.ok || data.error) {
          const msg = data.error ?? `Request failed (${res.status})`;
          columns.movie = { loading: false, results: [], error: msg };
          columns.tv = { loading: false, results: [], error: msg };
          emit();
          return;
        }

        columns.movie = {
          loading: false,
          results: data.movies ?? [],
          error: null,
        };
        columns.tv = {
          loading: false,
          results: data.tv ?? [],
          error: null,
        };
        emit();
      } catch (err) {
        if (signal?.aborted) return;
        const msg = err instanceof Error ? err.message : "Network error";
        columns.movie = { loading: false, results: [], error: msg };
        columns.tv = { loading: false, results: [], error: msg };
        emit();
      }
      return;
    }

    const path =
      source === "game"
        ? "games"
        : source === "book"
          ? "books"
          : "music";
    const result = await fetchColumn(`/api/search/${path}?q=${q}`, signal);
    if (signal?.aborted) return;
    columns[source] = {
      loading: false,
      results: result.results,
      error: result.error,
    };
    emit();
  });

  await Promise.all(tasks);
  return snapshot(columns);
}

export function flattenRanked(
  query: string,
  columns: SearchColumns,
  limit?: number
): UnifiedMediaItem[] {
  const items = MEDIA_TYPES.flatMap((type) => columns[type].results);
  const ranked = rankByRelevance(query, items);
  return limit != null ? ranked.slice(0, limit) : ranked;
}

export function columnsStillLoading(columns: SearchColumns): boolean {
  return MEDIA_TYPES.some((type) => columns[type].loading);
}
