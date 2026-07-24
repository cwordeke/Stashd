"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useSearchUI } from "@/context/SearchUIContext";
import MediaCard from "@/components/MediaCard";
import {
  MEDIA_TYPE_LABELS,
  MEDIA_TYPES,
  type ColumnState,
  type MediaType,
  type SearchResponse,
  type UnifiedMediaItem,
} from "@/lib/types";
import { cn } from "@/lib/cn";

const emptyColumn = (): ColumnState => ({
  loading: false,
  results: [],
  error: null,
});

async function fetchColumn(
  url: string
): Promise<{ results: UnifiedMediaItem[]; error: string | null }> {
  try {
    const res = await fetch(url);
    const data = (await res.json()) as SearchResponse;

    if (!res.ok || data.error) {
      return {
        results: [],
        error: data.error ?? `Request failed (${res.status})`,
      };
    }

    return { results: data.results ?? [], error: null };
  } catch (err) {
    return {
      results: [],
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

interface TmdbSplitResponse {
  movies?: UnifiedMediaItem[];
  tv?: UnifiedMediaItem[];
  error?: string;
}

export default function SearchModal() {
  const { isOpen, closeSearch, filterType, setFilterType } = useSearchUI();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [movies, setMovies] = useState<ColumnState>(emptyColumn);
  const [tv, setTv] = useState<ColumnState>(emptyColumn);
  const [games, setGames] = useState<ColumnState>(emptyColumn);
  const [books, setBooks] = useState<ColumnState>(emptyColumn);
  const [music, setMusic] = useState<ColumnState>(emptyColumn);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  async function runSearch(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const q = encodeURIComponent(trimmed);
    setHasSearched(true);

    const shouldFetch = (type: MediaType) =>
      !filterType || filterType === type;

    if (shouldFetch("movie") || shouldFetch("tv")) {
      setMovies({ loading: true, results: [], error: null });
      setTv({ loading: true, results: [], error: null });
    } else {
      setMovies(emptyColumn());
      setTv(emptyColumn());
    }

    if (shouldFetch("game")) {
      setGames({ loading: true, results: [], error: null });
    } else {
      setGames(emptyColumn());
    }

    if (shouldFetch("book")) {
      setBooks({ loading: true, results: [], error: null });
    } else {
      setBooks(emptyColumn());
    }

    if (shouldFetch("music")) {
      setMusic({ loading: true, results: [], error: null });
    } else {
      setMusic(emptyColumn());
    }

    const tasks: Promise<void>[] = [];

    if (shouldFetch("movie") || shouldFetch("tv")) {
      tasks.push(
        (async () => {
          try {
            const res = await fetch(`/api/search/tmdb?q=${q}`);
            const data = (await res.json()) as TmdbSplitResponse;

            if (!res.ok || data.error) {
              const msg = data.error ?? `Request failed (${res.status})`;
              if (shouldFetch("movie")) {
                setMovies({ loading: false, results: [], error: msg });
              }
              if (shouldFetch("tv")) {
                setTv({ loading: false, results: [], error: msg });
              }
              return;
            }

            if (shouldFetch("movie")) {
              setMovies({
                loading: false,
                results: data.movies ?? [],
                error: null,
              });
            }
            if (shouldFetch("tv")) {
              setTv({
                loading: false,
                results: data.tv ?? [],
                error: null,
              });
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Network error";
            if (shouldFetch("movie")) {
              setMovies({ loading: false, results: [], error: msg });
            }
            if (shouldFetch("tv")) {
              setTv({ loading: false, results: [], error: msg });
            }
          }
        })()
      );
    }

    if (shouldFetch("game")) {
      tasks.push(
        fetchColumn(`/api/search/games?q=${q}`).then((r) =>
          setGames({ loading: false, results: r.results, error: r.error })
        )
      );
    }

    if (shouldFetch("book")) {
      tasks.push(
        fetchColumn(`/api/search/books?q=${q}`).then((r) =>
          setBooks({ loading: false, results: r.results, error: r.error })
        )
      );
    }

    if (shouldFetch("music")) {
      tasks.push(
        fetchColumn(`/api/search/music?q=${q}`).then((r) =>
          setMusic({ loading: false, results: r.results, error: r.error })
        )
      );
    }

    await Promise.all(tasks);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void runSearch(query);
  }

  if (!isOpen) return null;

  const allSections: { type: MediaType; state: ColumnState }[] = [
    { type: "movie", state: movies },
    { type: "tv", state: tv },
    { type: "game", state: games },
    { type: "book", state: books },
    { type: "music", state: music },
  ];
  const sections = allSections.filter(
    (s) => !filterType || s.type === filterType
  );

  const flatResults = sections.flatMap((s) => s.state.results);
  const anyLoading = sections.some((s) => s.state.loading);
  const anyError = sections.find((s) => s.state.error)?.state.error;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-3 py-6 sm:px-6 sm:py-16">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closeSearch}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search all media"
        className="relative z-10 flex max-h-[min(860px,90vh)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/50"
      >
        <div className="border-b border-zinc-800 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-zinc-300">
              Search all media
              {filterType ? (
                <span className="ml-2 rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-400">
                  {MEDIA_TYPE_LABELS[filterType]}
                </span>
              ) : null}
            </h2>
            <button
              type="button"
              onClick={closeSearch}
              className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white"
            >
              Esc
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, TV, games, books, music..."
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none ring-emerald-500/40 placeholder:text-zinc-500 focus:border-emerald-600 focus:ring-2"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Search
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <FilterChip
              active={!filterType}
              label="All"
              onClick={() => setFilterType(null)}
            />
            {MEDIA_TYPES.map((type) => (
              <FilterChip
                key={type}
                active={filterType === type}
                label={MEDIA_TYPE_LABELS[type]}
                onClick={() => setFilterType(type)}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {!hasSearched && (
            <p className="py-12 text-center text-sm text-zinc-500">
              Type a query and hit Search — results appear here with Add to
              Stash.
            </p>
          )}

          {hasSearched && anyLoading && (
            <p className="mb-4 text-sm text-zinc-400">Loading...</p>
          )}

          {hasSearched && !anyLoading && flatResults.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">
              {anyError ?? "No results"}
            </p>
          )}

          {hasSearched && flatResults.length > 0 && (
            <div className="space-y-8">
              {sections.map(({ type, state }) => {
                if (!state.results.length && !state.error && !state.loading) {
                  return null;
                }

                return (
                  <section key={type}>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {MEDIA_TYPE_LABELS[type]}
                    </h3>

                    {state.loading && (
                      <p className="text-sm text-zinc-500">Loading...</p>
                    )}
                    {state.error && (
                      <p className="text-sm text-red-400">{state.error}</p>
                    )}
                    {!state.loading && !state.error && state.results.length === 0 && (
                      <p className="text-sm text-zinc-500">No results</p>
                    )}
                    {state.results.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {state.results.map((item) => (
                          <MediaCard
                            key={`${item.mediaType}-${item.id}`}
                            item={item}
                            showAddButton
                            compact
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
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
