"use client";

import Image from "next/image";
import Link from "next/link";
import type { MouseEvent } from "react";
import DisplayStars from "@/components/DisplayStars";
import {
  MEDIA_TYPE_LABELS,
  mediaDetailPath,
  type UnifiedMediaItem,
} from "@/lib/types";
import { cn } from "@/lib/cn";
import { useStash } from "@/context/StashContext";

interface MediaCardProps {
  item: UnifiedMediaItem & { stashId?: string };
  showAddButton?: boolean;
  compact?: boolean;
  onRemove?: () => void;
  rating?: number | null;
  liked?: boolean;
}

export default function MediaCard({
  item,
  showAddButton = false,
  compact = false,
  onRemove,
  rating = null,
  liked = false,
}: MediaCardProps) {
  const { addToStash, isInStash, isPending, pendingKey } = useStash();
  const inStash = isInStash(item);
  const itemKey = `${item.mediaType}:${item.id}`;
  const thisPending =
    isPending &&
    (pendingKey === itemKey ||
      (item.stashId != null && pendingKey === item.stashId));
  const href = mediaDetailPath(item.mediaType, item.id);

  function handleAdd(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addToStash(item);
  }

  function handleRemove(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onRemove?.();
  }

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 transition hover:border-zinc-600 hover:bg-zinc-900",
        compact && "rounded-lg"
      )}
    >
      <Link href={href} className="flex min-h-0 flex-1 flex-col outline-none">
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

          {liked ? (
            <span
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-emerald-400 backdrop-blur"
              aria-label="Liked"
            >
              <HeartIcon />
            </span>
          ) : null}

          {rating != null ? (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6">
              <DisplayStars rating={rating} />
            </div>
          ) : null}
        </div>

        <div className={cn("flex flex-1 flex-col gap-1 p-3", compact && "p-2")}>
          <h3
            className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100"
            title={item.title}
          >
            {item.title}
          </h3>
          <p className="truncate text-xs text-zinc-400">{item.creator}</p>
          <p className="text-xs text-zinc-500">{item.year}</p>
        </div>
      </Link>

      {(showAddButton || onRemove) && (
        <div className={cn("px-3 pb-3", compact && "px-2 pb-2")}>
          {showAddButton && (
            <button
              type="button"
              onClick={handleAdd}
              disabled={inStash || thisPending}
              className={cn(
                "mt-0 w-full rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                inStash
                  ? "cursor-default bg-zinc-800 text-zinc-500"
                  : "bg-emerald-600/90 text-white hover:bg-emerald-500 disabled:opacity-60"
              )}
            >
              {inStash ? "In Stash" : thisPending ? "Saving…" : "Add to Stash"}
            </button>
          )}

          {onRemove && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={thisPending}
              className="mt-2 w-full rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M12 20s-7-4.4-7-9.2C5 7.5 7.2 5.5 9.6 5.5c1.4 0 2.6.7 3.4 1.8.8-1.1 2-1.8 3.4-1.8 2.4 0 4.6 2 4.6 5.3C21 15.6 12 20 12 20z"
        fill="currentColor"
      />
    </svg>
  );
}
