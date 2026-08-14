import MediaCard from "@/components/MediaCard";
import type { UnifiedMediaItem } from "@/lib/types";

interface MediaGridProps {
  items: UnifiedMediaItem[];
  emptyMessage?: string;
}

export default function MediaGrid({
  items,
  emptyMessage = "Nothing here yet.",
}: MediaGridProps) {
  if (!items.length) {
    return (
      <p className="rounded-md border border-white/[0.06] px-4 py-10 text-center text-sm text-zinc-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => (
        <MediaCard key={`${item.mediaType}-${item.id}`} item={item} />
      ))}
    </div>
  );
}
