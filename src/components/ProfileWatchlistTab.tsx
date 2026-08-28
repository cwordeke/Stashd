"use client";

import MediaCard from "@/components/MediaCard";
import EmptyState from "@/components/EmptyState";
import type { WatchlistItem } from "@/lib/profile-tabs";

interface ProfileWatchlistTabProps {
  items: WatchlistItem[];
}

export default function ProfileWatchlistTab({
  items,
}: ProfileWatchlistTabProps) {
  if (!items.length) {
    return (
      <EmptyState
        illustration="empty-stash"
        title="Nothing saved yet"
        description="Bookmarked movies, shows, games, books, and albums from your lists will land here. Add items to a list, backlog, reading list, or queue on any media page."
      />
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
