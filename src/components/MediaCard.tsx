"use client";

import Image from "next/image";
import Link from "next/link";
import DisplayStars from "@/components/DisplayStars";
import {
  MEDIA_TYPE_LABELS,
  mediaDetailPath,
  type UnifiedMediaItem,
} from "@/lib/types";
import { cn } from "@/lib/cn";

interface MediaCardProps {
  item: UnifiedMediaItem & { stashId?: string };
  compact?: boolean;
  rating?: number | null;
  liked?: boolean;
}

export default function MediaCard({
  item,
  compact = false,
  rating = null,
  liked = false,
}: MediaCardProps) {
  const href = mediaDetailPath(item.mediaType, item.id);

  return (
    <article
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-md border border-white/10 bg-zinc-900/80 transition-colors hover:border-white/20 hover:bg-zinc-900"
      )}
    >
      <Link href={href} className="flex h-full min-h-0 flex-1 flex-col outline-none">
        <div className="relative aspect-[2/3] w-full shrink-0 overflow-hidden bg-zinc-800">
          {item.thumbnail ? (
            <Image
              src={item.thumbnail}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 160px"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-800 px-2 text-center text-xs text-zinc-500">
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

        <div
          className={cn(
            "flex flex-1 flex-col gap-0.5 p-3",
            compact && "min-h-[4.5rem] p-2"
          )}
        >
          <h3
            className={cn(
              "font-medium leading-snug text-zinc-100",
              compact
                ? "line-clamp-1 text-[13px]"
                : "line-clamp-2 text-sm"
            )}
            title={item.title}
          >
            {item.title}
          </h3>
          <p className="truncate text-xs text-zinc-400">{item.creator}</p>
          <p className="text-xs text-zinc-500">{item.year}</p>
        </div>
      </Link>
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
