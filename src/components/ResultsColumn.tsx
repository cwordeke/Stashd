"use client";

import type { MediaItem } from "@/lib/types";
import MediaItemRow from "./MediaItemRow";

interface ResultsColumnProps {
  title: string;
  loading: boolean;
  error: string | null;
  results: MediaItem[];
  hasSearched: boolean;
}

export default function ResultsColumn({
  title,
  loading,
  error,
  results,
  hasSearched,
}: ResultsColumnProps) {
  return (
    <section
      style={{
        border: "1px solid #ccc",
        padding: "0.75rem",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        background: "#fff",
      }}
    >
      <h2
        style={{
          margin: "0 0 0.75rem",
          fontSize: "1rem",
          borderBottom: "1px solid #ccc",
          paddingBottom: "0.5rem",
        }}
      >
        {title}
      </h2>

      {loading && <p style={{ margin: 0 }}>Loading...</p>}

      {!loading && error && (
        <p style={{ margin: 0, color: "#b00020" }}>{error}</p>
      )}

      {!loading && !error && hasSearched && results.length === 0 && (
        <p style={{ margin: 0, color: "#666" }}>No results</p>
      )}

      {!loading && !error && results.length > 0 && (
        <ul style={{ margin: 0, padding: 0 }}>
          {results.map((item) => (
            <MediaItemRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      {!loading && !error && !hasSearched && (
        <p style={{ margin: 0, color: "#999" }}>Waiting for search</p>
      )}
    </section>
  );
}
