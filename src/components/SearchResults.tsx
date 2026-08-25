"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MediaCard from "@/components/MediaCard";
import { MediaGridSkeleton } from "@/components/LoadingSkeleton";
import {
  columnsStillLoading,
  emptySearchColumns,
  fetchSearchSources,
  flattenRanked,
  mediaTypesForSource,
  sourcesForFilter,
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

function hasAnyResults(columns: SearchColumns): boolean {
  return MEDIA_TYPES.some((type) => columns[type].results.length > 0);
}

export default function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const loadedQueryRef = useRef<string | null>(null);
  const columnsRef = useRef<SearchColumns>(emptySearchColumns());
  const fetchedRef = useRef<Set<SearchSource>>(new Set());
  const requestIdRef = useRef(0);
  const filterAbortRef = useRef<AbortController | null>(null);

  const q = searchParams.get("q")?.trim() ?? "";
  const typeParam = searchParams.get("type");
  const filterType: MediaType | null =
    typeParam && isMediaType(typeParam) ? typeParam : null;

  const [inputValue, setInputValue] = useState(q);
  const [columns, setColumns] = useState<SearchColumns>(emptySearchColumns);
  const [fetchedSources, setFetchedSources] = useState<SearchSource[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
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

  // New query: fetch sources for the active filter.
  // All → all providers in parallel (paint as each returns). Typed → one provider.
  useEffect(() => {
    if (!q) {
      loadedQueryRef.current = null;
      setLoadedQuery(null);
      commitColumns(emptySearchColumns());
      commitFetched(new Set());
      setHasSearched(false);
      setInitialLoading(false);
      setFilterLoading(false);
      setVisibleCount(PAGE_SIZE);
      return;
    }

    if (loadedQueryRef.current === q) return;

    filterAbortRef.current?.abort();
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const sources = sourcesForFilter(filterType);

    setInitialLoading(true);
    setHasSearched(true);
    setFilterLoading(false);
    commitColumns(emptySearchColumns());
    commitFetched(new Set());
    setLoadedQuery(null);
    setVisibleCount(PAGE_SIZE);

    void (async () => {
      const next = await fetchSearchSources(q, sources, {
        signal: controller.signal,
        onUpdate: (partial) => {
          if (requestId !== requestIdRef.current) return;
          commitColumns(partial);

          const settledSources = sources.filter((source) =>
            mediaTypesForSource(source).every((type) => !partial[type].loading)
          );
          if (settledSources.length > 0) {
            commitFetched(new Set([...fetchedRef.current, ...settledSources]));
          }

          if (hasAnyResults(partial) || settledSources.length > 0) {
            setLoadedQuery(q);
            setInitialLoading(false);
          }
        },
      });

      if (requestId !== requestIdRef.current) return;
      commitColumns(next);
      commitFetched(new Set(sources));
      loadedQueryRef.current = q;
      setLoadedQuery(q);
      setInitialLoading(false);
    })();

    return () => controller.abort();
    // filterType read once per new query; chip changes handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Filter chip: fetch only missing sources for that type (no full reload).
  useEffect(() => {
    if (!q || loadedQueryRef.current !== q) return;

    const toFetch = sourcesForFilter(filterType).filter((source) => {
      if (fetchedRef.current.has(source)) return false;
      return !mediaTypesForSource(source).some(
        (type) => columnsRef.current[type].loading
      );
    });

    if (toFetch.length === 0) return;

    filterAbortRef.current?.abort();
    const controller = new AbortController();
    filterAbortRef.current = controller;
    setFilterLoading(true);

    void (async () => {
      const next = await fetchSearchSources(q, toFetch, {
        signal: controller.signal,
        base: columnsRef.current,
        onUpdate: (partial) => {
          if (loadedQueryRef.current !== q) return;
          commitColumns(partial);
        },
      });
      if (controller.signal.aborted || loadedQueryRef.current !== q) return;
      commitColumns(next);
      commitFetched(new Set([...fetchedRef.current, ...toFetch]));
      setFilterLoading(false);
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
  const hasMore = rankedResults.length > visibleCount;
  const sourcesPending = columnsStillLoading(columns) || filterLoading;
  const anyError = MEDIA_TYPES.map((t) => columns[t].error).find(Boolean);
  const showEmpty =
    q &&
    hasSearched &&
    !initialLoading &&
    !sourcesPending &&
    rankedResults.length === 0;

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
            className="min-w-0 flex-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-zinc-500 focus:border-white/[0.18]"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="rounded-md bg-emerald-600 px-3.5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
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

      {q &&
      visibleResults.length === 0 &&
      (initialLoading || sourcesPending) ? (
        <MediaGridSkeleton />
      ) : null}

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
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="cursor-pointer rounded-md border border-white/10 px-4 py-2 text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
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
        "rounded-md px-2.5 py-1 text-[13px] transition-colors",
        active
          ? "bg-white/[0.08] text-white"
          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
      )}
    >
      {label}
    </button>
  );
}
