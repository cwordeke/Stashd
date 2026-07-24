import MediaCard from "@/components/MediaCard";
import type { UnifiedMediaItem } from "@/lib/types";

interface MediaGridProps {
  items: UnifiedMediaItem[];
  showAddButton?: boolean;
  emptyMessage?: string;
}

export default function MediaGrid({
  items,
  showAddButton = true,
  emptyMessage = "Nothing here yet.",
}: MediaGridProps) {
  if (!items.length) {
    return (
      <p className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-10 text-center text-sm text-zinc-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => (
        <MediaCard
          key={`${item.mediaType}-${item.id}`}
          item={item}
          showAddButton={showAddButton}
        />
      ))}
    </div>
  );
}
