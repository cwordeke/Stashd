"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MediaCard from "@/components/MediaCard";
import { useNavigationPending } from "@/context/NavigationPendingContext";
import {
  columnsStillLoading,
  emptySearchColumns,
  fetchSearchSources,
  flattenRanked,
  remainingSourcesForAll,
  sourceForFilter,
  type SearchColumns,
  type SearchSource,
} from "@/lib/search-client";
import {
  MEDIA_TYPE_LABELS,
  MEDIA_TYPES,
  isMediaType,
  type MediaType,
} from "@/lib/types";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 12;

export default function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { beginNavigation } = useNavigationPending();
  const inputRef = useRef<HTMLInputElement>(null);
  const loadedQueryRef = useRef<string | null>(null);
  const columnsRef = useRef<SearchColumns>(emptySearchColumns());
  const fetchedRef = useRef<Set<SearchSource>>(new Set());
  const requestIdRef = useRef(0);
  const expandAbortRef = useRef<AbortController | null>(null);

  const q = searchParams.get("q")?.trim() ?? "";
  const typeParam = searchParams.get("type");
  const filterType: MediaType | null =
    typeParam && isMediaType(typeParam) ? typeParam : null;

  const [inputValue, setInputValue] = useState(q);
  const [columns, setColumns] = useState<SearchColumns>(emptySearchColumns);
  const [fetchedSources, setFetchedSources] = useState<SearchSource[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  function commitColumns(next: SearchColumns) {
    columnsRef.current = next;
    setColumns(next);
  }

  function commitFetched(next: Set<SearchSource>) {
    fetchedRef.current = next;
    setFetchedSources([...next]);
  }

  useEffect(() => {
    setInputValue(q);
  }, [q]);

  // Fast path: only the source needed for the current filter (All → TMDB).
  useEffect(() => {
    if (!q) {
      loadedQueryRef.current = null;
      setLoadedQuery(null);
      commitColumns(emptySearchColumns());
      commitFetched(new Set());
      setHasSearched(false);
      setInitialLoading(false);
      setExpanding(false);
      setVisibleCount(PAGE_SIZE);
      return;
    }

    if (loadedQueryRef.current === q) return;

    expandAbortRef.current?.abort();
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const initialSource = sourceForFilter(filterType);

    setInitialLoading(true);
    setHasSearched(true);
    setExpanding(false);
    commitColumns(emptySearchColumns());
    commitFetched(new Set());
    setLoadedQuery(null);
    setVisibleCount(PAGE_SIZE);

    void (async () => {
      const next = await fetchSearchSources(q, [initialSource], {
        signal: controller.signal,
        onUpdate: (partial) => {
          if (requestId !== requestIdRef.current) return;
          commitColumns(partial);
          const settled = !columnsStillLoading(partial);
          if (settled || partial.movie.results.length || partial.tv.results.length) {
            setLoadedQuery(q);
            setInitialLoading(false);
          }
        },
      });

      if (requestId !== requestIdRef.current) return;
      commitColumns(next);
      commitFetched(new Set([initialSource]));
      loadedQueryRef.current = q;
      setLoadedQuery(q);
      setInitialLoading(false);
    })();

    return () => controller.abort();
    // Only re-run on new query — filter changes use on-demand fetch below.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: filter must not refetch full search
  }, [q]);

  // If user picks a filter whose source isn't loaded yet, fetch just that source.
  useEffect(() => {
    if (!q || loadedQueryRef.current !== q) return;

    const needed = sourceForFilter(filterType);
    if (fetchedRef.current.has(needed)) return;
    if (columnsRef.current[mediaTypeForPending(needed)].loading) return;

    expandAbortRef.current?.abort();
    const controller = new AbortController();
    expandAbortRef.current = controller;
    setExpanding(true);

    void (async () => {
      const next = await fetchSearchSources(q, [needed], {
        signal: controller.signal,
        base: columnsRef.current,
        onUpdate: (partial) => {
          if (loadedQueryRef.current !== q) return;
          commitColumns(partial);
        },
      });
      if (controller.signal.aborted || loadedQueryRef.current !== q) return;
      commitColumns(next);
      commitFetched(new Set([...fetchedRef.current, needed]));
      setExpanding(false);
    })();

    return () => controller.abort();
  }, [q, filterType, fetchedSources]);

  useEffect(() => {
    if (!q) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [q]);

  const rankedResults =
    q && loadedQuery === q
      ? flattenRanked(q, columns).filter(
          (item) => !filterType || item.mediaType === filterType
        )
      : [];
  const visibleResults = rankedResults.slice(0, visibleCount);
  const hasMoreLocal = rankedResults.length > visibleCount;
  const deferredSources =
    !filterType && loadedQuery === q
      ? remainingSourcesForAll(fetchedSources)
      : [];
  const canExpandSources = deferredSources.length > 0;
  const hasMore = hasMoreLocal || canExpandSources;
  const sourcesPending = columnsStillLoading(columns) || expanding;
  const anyError = MEDIA_TYPES.map((t) => columns[t].error).find(Boolean);
  const showEmpty =
    q &&
    hasSearched &&
    !initialLoading &&
    !sourcesPending &&
    rankedResults.length === 0;

  async function handleLoadMore() {
    if (hasMoreLocal) {
      setVisibleCount((c) => c + PAGE_SIZE);
      return;
    }

    if (!canExpandSources || !q) return;

    expandAbortRef.current?.abort();
    const controller = new AbortController();
    expandAbortRef.current = controller;
    setExpanding(true);

    const next = await fetchSearchSources(q, deferredSources, {
      signal: controller.signal,
      base: columnsRef.current,
      onUpdate: (partial) => {
        if (loadedQueryRef.current !== q) return;
        commitColumns(partial);
      },
    });

    if (controller.signal.aborted || loadedQueryRef.current !== q) return;
    commitColumns(next);
    commitFetched(new Set([...fetchedRef.current, ...deferredSources]));
    setVisibleCount((c) => c + PAGE_SIZE);
    setExpanding(false);
  }

  function replaceParams(nextQ: string, nextType: MediaType | null) {
    const params = new URLSearchParams();
    const trimmed = nextQ.trim();
    if (trimmed) params.set("q", trimmed);
    if (nextType) params.set("type", nextType);
    const href = params.toString() ? `/search?${params}` : "/search";
    router.replace(href, { scroll: false });
  }

  function pushNewQuery(nextQ: string, nextType: MediaType | null) {
    const trimmed = nextQ.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    if (nextType) params.set("type", nextType);
    const href = params.toString() ? `/search?${params}` : "/search";
    if (trimmed !== q) {
      loadedQueryRef.current = null;
      beginNavigation(href);
      router.push(href);
      return;
    }
    replaceParams(trimmed, nextType);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    pushNewQuery(inputValue, filterType);
  }

  function handleFilter(nextType: MediaType | null) {
    setVisibleCount(PAGE_SIZE);
    replaceParams(q || inputValue, nextType);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Search
        </h1>

        <form onSubmit={handleSubmit} className="flex max-w-xl gap-2">
          <input
            ref={inputRef}
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search movies, TV, games, books, music…"
            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none ring-emerald-500/40 placeholder:text-zinc-500 focus:border-emerald-600 focus:ring-2"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={!filterType}
            label="All"
            onClick={() => handleFilter(null)}
          />
          {MEDIA_TYPES.map((type) => (
            <FilterChip
              key={type}
              active={filterType === type}
              label={MEDIA_TYPE_LABELS[type]}
              onClick={() => handleFilter(type)}
            />
          ))}
        </div>
      </div>

      {!q && (
        <p className="py-12 text-center text-sm text-zinc-500">
          {filterType
            ? `Type a query to search ${MEDIA_TYPE_LABELS[filterType].toLowerCase()}.`
            : "Type a query to search all media."}
        </p>
      )}

      {q && initialLoading && visibleResults.length === 0 && (
        <p className="mb-4 text-sm text-zinc-400">Loading…</p>
      )}

      {showEmpty && (
        <p className="py-8 text-center text-sm text-zinc-500">
          {anyError ??
            (filterType
              ? `No ${MEDIA_TYPE_LABELS[filterType].toLowerCase()} results`
              : "No results")}
        </p>
      )}

      {visibleResults.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {visibleResults.map((item) => (
              <MediaCard
                key={`${item.mediaType}-${item.id}`}
                item={item}
                compact
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => void handleLoadMore()}
                disabled={expanding && !hasMoreLocal}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {expanding && !hasMoreLocal
                  ? "Loading…"
                  : canExpandSources && !hasMoreLocal
                    ? "Load more sources"
                    : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      {q &&
        !initialLoading &&
        expanding &&
        visibleResults.length === 0 &&
        filterType && (
          <p className="mt-2 text-sm text-zinc-500">Loading…</p>
        )}
    </div>
  );
}

function mediaTypeForPending(source: SearchSource): MediaType {
  if (source === "tmdb") return "movie";
  return source;
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs transition",
        active
          ? "bg-zinc-100 text-zinc-900"
          : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      )}
    >
      {label}
    </button>
  );
}
