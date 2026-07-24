"use client";

import Image from "next/image";
import { MEDIA_TYPE_LABELS, type UnifiedMediaItem } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useStash } from "@/context/StashContext";

interface MediaCardProps {
  item: UnifiedMediaItem;
  showAddButton?: boolean;
  compact?: boolean;
  onRemove?: () => void;
}

export default function MediaCard({
  item,
  showAddButton = false,
  compact = false,
  onRemove,
}: MediaCardProps) {
  const { addToStash, isInStash } = useStash();
  const inStash = isInStash(item);

  function handleAdd() {
    addToStash(item);
  }

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 transition hover:border-zinc-600 hover:bg-zinc-900",
        compact && "rounded-lg"
      )}
    >
      {/* Uniform 2:3 frame — object-cover normalizes all source aspect ratios */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800">
        {item.thumbnail ? (
          <Image
            src={item.thumbnail}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 160px"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 px-2 text-center text-xs text-zinc-500">
            No artwork
          </div>
        )}

        <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-200 backdrop-blur">
          {MEDIA_TYPE_LABELS[item.mediaType].replace(/s$/, "")}
        </span>
      </div>

      <div className={cn("flex flex-1 flex-col gap-1 p-3", compact && "p-2")}>
        <h3
          className={cn(
            "line-clamp-2 font-medium leading-snug text-zinc-100",
            compact ? "text-sm" : "text-sm"
          )}
          title={item.title}
        >
          {item.title}
        </h3>
        <p className="truncate text-xs text-zinc-400">{item.creator}</p>
        <p className="text-xs text-zinc-500">{item.year}</p>

        {showAddButton && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={inStash}
            className={cn(
              "mt-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
              inStash
                ? "cursor-default bg-zinc-800 text-zinc-500"
                : "bg-emerald-600/90 text-white hover:bg-emerald-500"
            )}
          >
            {inStash ? "In Stash" : "Add to Stash"}
          </button>
        )}

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-2 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
          >
            Remove
          </button>
        )}
      </div>
    </article>
  );
}
