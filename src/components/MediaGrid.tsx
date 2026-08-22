"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import MediaCard from "@/components/MediaCard";
import { MEDIA_GRID_MAX_COLS, MEDIA_GRID_ROWS } from "@/lib/constants";
import { cn } from "@/lib/cn";
import type { UnifiedMediaItem } from "@/lib/types";

interface MediaGridProps {
  items: UnifiedMediaItem[];
  emptyMessage?: string;
}

const COL_QUERIES = [
  { query: "(min-width: 1280px)", cols: 6 },
  { query: "(min-width: 1024px)", cols: 5 },
  { query: "(min-width: 768px)", cols: 4 },
  { query: "(min-width: 640px)", cols: 3 },
] as const;

function gridColumns(): number {
  for (const { query, cols } of COL_QUERIES) {
    if (window.matchMedia(query).matches) return cols;
  }
  return 2;
}

function subscribeGridColumns(onStoreChange: () => void) {
  const media = COL_QUERIES.map(({ query }) => window.matchMedia(query));
  for (const mql of media) {
    mql.addEventListener("change", onStoreChange);
  }
  return () => {
    for (const mql of media) {
      mql.removeEventListener("change", onStoreChange);
    }
  };
}

function useGridColumns() {
  return useSyncExternalStore(
    subscribeGridColumns,
    gridColumns,
    () => MEDIA_GRID_MAX_COLS
  );
}

export default function MediaGrid({
  items,
  emptyMessage = "Nothing here yet.",
}: MediaGridProps) {
  const cols = useGridColumns();
  const [pages, setPages] = useState(1);

  const pageSize = cols * MEDIA_GRID_ROWS;
  const visibleCount = Math.min(items.length, pages * pageSize);
  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    setPages((current) => current + 1);
  }, []);

  if (!items.length) {
    return (
      <p className="rounded-md border border-white/[0.06] px-4 py-10 text-center text-sm text-zinc-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
          pages === 1 && "media-grid-preview"
        )}
      >
        {visibleItems.map((item) => (
          <MediaCard key={`${item.mediaType}-${item.id}`} item={item} />
        ))}
      </div>

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            className="rounded-md border border-white/10 px-4 py-2 text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}
