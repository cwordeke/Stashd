"use client";

import MediaCard from "@/components/MediaCard";
import type { WatchlistItem } from "@/lib/profile-tabs";

interface ProfileWatchlistTabProps {
  items: WatchlistItem[];
}

export default function ProfileWatchlistTab({
  items,
}: ProfileWatchlistTabProps) {
  if (!items.length) {
    return (
      <div className="border border-dashed border-white/10 px-6 py-16 text-center">
        <p className="text-sm font-medium text-zinc-200">Nothing saved yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
          Bookmarked movies, shows, games, books, and albums from your lists will
          land here. Add items to a list, backlog, reading list, or queue on any
          media page.
        </p>
        <div className="mx-auto mt-8 grid max-w-lg grid-cols-4 gap-2 opacity-40">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-lg bg-zinc-800/80"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        {items.length} bookmarked {items.length === 1 ? "item" : "items"}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <MediaCard key={`${item.mediaType}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  );
}
