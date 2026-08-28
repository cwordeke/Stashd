"use client";

import { useMemo, useState } from "react";
import MediaCard from "@/components/MediaCard";
import EmptyState from "@/components/EmptyState";
import { cn } from "@/lib/cn";
import type { StashTabItem } from "@/lib/profile-tabs";
import type { MediaType } from "@/lib/types";

type FilterType = "all" | MediaType;
type SortMode = "recent" | "highest" | "lowest";

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "TV" },
  { id: "game", label: "Games" },
  { id: "book", label: "Books" },
  { id: "music", label: "Music" },
];

interface ProfileStashTabProps {
  items: StashTabItem[];
}

export default function ProfileStashTab({ items }: ProfileStashTabProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortMode>("recent");

  const visible = useMemo(() => {
    const filtered =
      filter === "all"
        ? items
        : items.filter((item) => item.mediaType === filter);

    const sorted = [...filtered];
    if (sort === "highest") {
      sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    } else if (sort === "lowest") {
      sorted.sort((a, b) => {
        const aR = a.rating ?? 99;
        const bR = b.rating ?? 99;
        return aR - bR;
      });
    } else {
      sorted.sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? ""));
    }
    return sorted;
  }, [filter, items, sort]);

  if (!items.length) {
    return (
      <EmptyState
        illustration="empty-stash"
        title="Nothing in stash"
        description="Rated, liked, or logged media will show up here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-zinc-800/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {FILTERS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              className={cn(
                "text-xs font-medium tracking-wide transition",
                filter === chip.id
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
          <span className="shrink-0">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="rounded-md border-0 bg-transparent py-1 text-xs normal-case tracking-normal text-zinc-300 outline-none transition hover:text-white focus:text-white"
          >
            <option value="recent" className="bg-zinc-900">
              Recently Added
            </option>
            <option value="highest" className="bg-zinc-900">
              Highest Rated
            </option>
            <option value="lowest" className="bg-zinc-900">
              Lowest Rated
            </option>
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <EmptyPanel
          title="No matches"
          body={`No ${filter === "all" ? "" : FILTERS.find((f) => f.id === filter)?.label.toLowerCase() + " "}items for this filter.`}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visible.map((item) => (
            <MediaCard
              key={`${item.mediaType}-${item.id}`}
              item={item}
              rating={item.rating}
              liked={item.liked}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-white/[0.06] px-6 py-14 text-center">
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      <p className="mt-1.5 text-sm text-zinc-500">{body}</p>
    </div>
  );
}
