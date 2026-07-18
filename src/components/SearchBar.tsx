"use client";

import { FormEvent, useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
}

export default function SearchBar({ onSearch, disabled }: SearchBarProps) {
  const [query, setQuery] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    onSearch(trimmed);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        gap: "0.5rem",
        flexWrap: "wrap",
        marginBottom: "1.25rem",
      }}
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search movies, TV, games, books, music..."
        disabled={disabled}
        style={{
          flex: "1 1 240px",
          padding: "0.6rem 0.75rem",
          fontSize: "1rem",
          border: "1px solid #999",
        }}
        aria-label="Search all media"
      />
      <button
        type="submit"
        disabled={disabled || !query.trim()}
        style={{
          padding: "0.6rem 1rem",
          fontSize: "1rem",
          cursor: disabled || !query.trim() ? "not-allowed" : "pointer",
        }}
      >
        Search All Media
      </button>
    </form>
  );
}
