"use client";

import MediaCard from "@/components/MediaCard";
import { useSearchUI } from "@/context/SearchUIContext";
import { useStash } from "@/context/StashContext";
import {
  MEDIA_TYPE_LABELS,
  type MediaType,
  type StashSlot,
} from "@/lib/types";

interface Top4ShelfProps {
  type: MediaType;
  items: StashSlot[];
}

export default function Top4Shelf({ type, items }: Top4ShelfProps) {
  const { openSearch } = useSearchUI();
  const { removeFromStash } = useStash();

  const slots: StashSlot[] = [...items];
  while (slots.length < 4) slots.push(null);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-100">
          Top 4 {MEDIA_TYPE_LABELS[type]}
        </h2>
        <button
          type="button"
          onClick={() => openSearch(type)}
          className="text-xs text-emerald-400 transition hover:text-emerald-300"
        >
          Search {MEDIA_TYPE_LABELS[type]}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {slots.slice(0, 4).map((item, index) =>
          item ? (
            <MediaCard
              key={item.stashId ?? `${item.id}-${index}`}
              item={item}
              compact
              onRemove={
                item.stashId
                  ? () => removeFromStash(item.stashId!, item)
                  : undefined
              }
            />
          ) : (
            <button
              key={`empty-${type}-${index}`}
              type="button"
              onClick={() => openSearch(type)}
              className="flex aspect-[2/3] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 text-zinc-500 transition hover:border-emerald-600/60 hover:bg-zinc-900 hover:text-emerald-400"
            >
              <span className="text-2xl font-light leading-none">+</span>
              <span className="text-xs font-medium">Add</span>
            </button>
          )
        )}
      </div>
    </section>
  );
}
