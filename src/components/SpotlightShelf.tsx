import MediaCard from "@/components/MediaCard";
import { MediaCardSkeleton } from "@/components/LoadingSkeleton";
import type { UnifiedMediaItem } from "@/lib/types";

interface SpotlightShelfProps {
  title: string;
  items: Array<UnifiedMediaItem & { rating?: number | null }>;
  emptyMessage?: string;
}

export default function SpotlightShelf({
  title,
  items,
  emptyMessage = "Nothing to show yet.",
}: SpotlightShelfProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:thin] sm:-mx-0 sm:px-0">
          <ul className="flex gap-3">
            {items.map((item) => (
              <li
                key={`${item.mediaType}-${item.id}`}
                className="w-[8.5rem] shrink-0 sm:w-36"
              >
                <MediaCard
                  item={item}
                  compact
                  rating={item.rating ?? null}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function SpotlightShelfSkeleton({ title }: { title: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
        {title}
      </h2>
      <div className="-mx-4 overflow-hidden px-4 sm:-mx-0 sm:px-0">
        <div className="flex gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="w-[8.5rem] shrink-0 sm:w-36">
              <MediaCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
