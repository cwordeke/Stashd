"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearMediaRating, rateMedia } from "@/app/actions/ratings";
import { cn } from "@/lib/cn";
import type { MediaType } from "@/lib/types";

interface StarRatingProps {
  mediaId: string;
  mediaType: MediaType;
  initialRating: number | null;
  isAuthenticated: boolean;
  /** Compact under-poster layout (no card chrome) */
  compact?: boolean;
  mediaMeta?: {
    title: string;
    creator: string;
    year: string;
    thumbnail: string | null;
  };
}

export default function StarRating({
  mediaId,
  mediaType,
  initialRating,
  isAuthenticated,
  compact = false,
  mediaMeta,
}: StarRatingProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [rating, setRating] = useState<number | null>(initialRating);
  const [optimisticRating, setOptimisticRating] = useOptimistic(
    rating,
    (_current, next: number | null) => next
  );

  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  const display = hoverRating ?? optimisticRating ?? 0;

  function handleSelect(value: number) {
    if (!isAuthenticated) {
      const next = encodeURIComponent(
        `${window.location.pathname}${window.location.search}`
      );
      router.push(`/login?next=${next}`);
      return;
    }

    startTransition(async () => {
      setOptimisticRating(value);
      const result = await rateMedia(mediaId, mediaType, value, mediaMeta);

      if (!result.ok) {
        return;
      }

      setRating(result.rating);
      router.refresh();
    });
  }

  function handleClear() {
    if (!isAuthenticated || optimisticRating == null) return;

    startTransition(async () => {
      setOptimisticRating(null);
      const result = await clearMediaRating(mediaId, mediaType);

      if (!result.ok) {
        return;
      }

      setRating(null);
      router.refresh();
    });
  }

  const starSize = compact ? "h-7 w-7" : "h-8 w-8";

  return (
    <div
      className={cn(
        !compact && "rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4"
      )}
    >
      {!compact ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Rated
          </p>
          {optimisticRating != null ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={isPending}
              className="text-xs text-zinc-500 transition hover:text-zinc-300"
              aria-label="Clear rating"
            >
              ✕
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div
          className="flex items-center gap-0.5"
          onMouseLeave={() => setHoverRating(null)}
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const fullValue = star;
            const halfValue = star - 0.5;
            const fillLevel =
              display >= fullValue ? 1 : display >= halfValue ? 0.5 : 0;

            return (
              <div key={star} className={cn("relative", starSize)}>
                <button
                  type="button"
                  aria-label={`Rate ${halfValue} stars`}
                  className="absolute inset-y-0 left-0 z-10 w-1/2"
                  disabled={isPending}
                  onMouseEnter={() => setHoverRating(halfValue)}
                  onFocus={() => setHoverRating(halfValue)}
                  onClick={() => handleSelect(halfValue)}
                />
                <button
                  type="button"
                  aria-label={`Rate ${fullValue} stars`}
                  className="absolute inset-y-0 right-0 z-10 w-1/2"
                  disabled={isPending}
                  onMouseEnter={() => setHoverRating(fullValue)}
                  onFocus={() => setHoverRating(fullValue)}
                  onClick={() => handleSelect(fullValue)}
                />
                <StarIcon
                  starId={star}
                  fill={fillLevel}
                  hovering={hoverRating != null}
                  className={starSize}
                />
              </div>
            );
          })}
        </div>

        {compact && optimisticRating != null ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className="text-xs text-zinc-500 transition hover:text-zinc-300"
            aria-label="Clear rating"
          >
            ✕
          </button>
        ) : null}
      </div>

      <p
        className={cn(
          "text-zinc-400",
          compact ? "mt-1.5 text-[11px]" : "mt-3 text-sm"
        )}
      >
        {!isAuthenticated
          ? "Sign in to rate"
          : optimisticRating != null
            ? `${optimisticRating} / 5`
            : "Rate"}
      </p>
    </div>
  );
}

function StarIcon({
  starId,
  fill,
  hovering,
  className,
}: {
  starId: number;
  fill: number;
  hovering: boolean;
  className?: string;
}) {
  const gradId = `star-grad-${starId}`;

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "pointer-events-none transition duration-150",
        className ?? "h-8 w-8",
        hovering && "scale-105"
      )}
      aria-hidden
    >
      {fill === 0.5 ? (
        <defs>
          <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#3f3f46" />
          </linearGradient>
        </defs>
      ) : null}
      <path
        d="M12 2.5l2.9 6.1 6.7.6-5.1 4.5 1.5 6.6L12 16.9 5.9 20.3l1.5-6.6L2.4 9.2l6.7-.6L12 2.5z"
        fill={
          fill === 0 ? "#3f3f46" : fill === 1 ? "#10b981" : `url(#${gradId})`
        }
        stroke="#27272a"
        strokeWidth="0.75"
      />
    </svg>
  );
}
