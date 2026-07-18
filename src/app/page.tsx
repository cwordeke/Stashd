"use client";

import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import ResultsColumn from "@/components/ResultsColumn";
import type { ColumnState, MediaItem, SearchResponse } from "@/lib/types";

const emptyColumn = (): ColumnState => ({
  loading: false,
  results: [],
  error: null,
});

async function fetchColumn(
  url: string
): Promise<{ results: MediaItem[]; error: string | null }> {
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
  movies?: MediaItem[];
  tv?: MediaItem[];
  results?: MediaItem[];
  error?: string;
}

export default function Home() {
  const [hasSearched, setHasSearched] = useState(false);
  const [movies, setMovies] = useState<ColumnState>(emptyColumn);
  const [tv, setTv] = useState<ColumnState>(emptyColumn);
  const [games, setGames] = useState<ColumnState>(emptyColumn);
  const [books, setBooks] = useState<ColumnState>(emptyColumn);
  const [music, setMusic] = useState<ColumnState>(emptyColumn);

  async function handleSearch(query: string) {
    const q = encodeURIComponent(query);
    setHasSearched(true);

    setMovies({ loading: true, results: [], error: null });
    setTv({ loading: true, results: [], error: null });
    setGames({ loading: true, results: [], error: null });
    setBooks({ loading: true, results: [], error: null });
    setMusic({ loading: true, results: [], error: null });

    const tmdbPromise = (async () => {
      try {
        const res = await fetch(`/api/search/tmdb?q=${q}`);
        const data = (await res.json()) as TmdbSplitResponse;

        if (!res.ok || data.error) {
          const msg = data.error ?? `Request failed (${res.status})`;
          setMovies({ loading: false, results: [], error: msg });
          setTv({ loading: false, results: [], error: msg });
          return;
        }

        setMovies({
          loading: false,
          results: data.movies ?? [],
          error: null,
        });
        setTv({
          loading: false,
          results: data.tv ?? [],
          error: null,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        setMovies({ loading: false, results: [], error: msg });
        setTv({ loading: false, results: [], error: msg });
      }
    })();

    const gamesPromise = fetchColumn(`/api/search/games?q=${q}`).then((r) =>
      setGames({ loading: false, results: r.results, error: r.error })
    );

    const booksPromise = fetchColumn(`/api/search/books?q=${q}`).then((r) =>
      setBooks({ loading: false, results: r.results, error: r.error })
    );

    const musicPromise = fetchColumn(`/api/search/music?q=${q}`).then((r) =>
      setMusic({ loading: false, results: r.results, error: r.error })
    );

    await Promise.all([tmdbPromise, gamesPromise, booksPromise, musicPromise]);
  }

  return (
    <main style={{ maxWidth: 1400, margin: "0 auto", padding: "1.25rem" }}>
      <header style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem" }}>Stashd</h1>
        <p style={{ margin: "0.35rem 0 0", color: "#555" }}>
          Omni-media search skeleton — movies, TV, games, books, and music.
        </p>
      </header>

      <SearchBar onSearch={handleSearch} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.75rem",
          alignItems: "start",
        }}
      >
        <ResultsColumn
          title="Movies"
          loading={movies.loading}
          error={movies.error}
          results={movies.results}
          hasSearched={hasSearched}
        />
        <ResultsColumn
          title="TV Shows"
          loading={tv.loading}
          error={tv.error}
          results={tv.results}
          hasSearched={hasSearched}
        />
        <ResultsColumn
          title="Games"
          loading={games.loading}
          error={games.error}
          results={games.results}
          hasSearched={hasSearched}
        />
        <ResultsColumn
          title="Books"
          loading={books.loading}
          error={books.error}
          results={books.results}
          hasSearched={hasSearched}
        />
        <ResultsColumn
          title="Music"
          loading={music.loading}
          error={music.error}
          results={music.results}
          hasSearched={hasSearched}
        />
      </div>
    </main>
  );
}
