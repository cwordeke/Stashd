"use client";

import Image from "next/image";
import {
  useEffect,
  useId,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { logMedia } from "@/app/actions/diary";
import { cn } from "@/lib/cn";
import type { MediaDetails, MediaType } from "@/lib/types";

interface LogMediaModalProps {
  details: MediaDetails;
  /** True when the user already has diary entries for this media */
  isRepeatLog?: boolean;
  open: boolean;
  onClose: () => void;
  onLogged?: () => void;
}

function todayISODate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function logLabels(mediaType: MediaType) {
  switch (mediaType) {
    case "game":
      return {
        date: "Played on",
        rewatch: "I've played this before",
      };
    case "book":
      return {
        date: "Read on",
        rewatch: "I've read this before",
      };
    case "music":
      return {
        date: "Listened on",
        rewatch: "I've listened to this before",
      };
    case "movie":
    case "tv":
    default:
      return {
        date: "Watched on",
        rewatch: "I've watched this before",
      };
  }
}

export default function LogMediaModal({
  details,
  isRepeatLog = false,
  open,
  onClose,
  onLogged,
}: LogMediaModalProps) {
  const router = useRouter();
  const titleId = useId();
  const [isPending, startTransition] = useTransition();
  const labels = logLabels(details.mediaType);

  const [loggedOn, setLoggedOn] = useState(todayISODate);
  const [isRewatch, setIsRewatch] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [review, setReview] = useState("");

  useEffect(() => {
    if (!open) return;
    // Always start fresh — never prefill previous rating/like/review
    setLoggedOn(todayISODate());
    setIsRewatch(isRepeatLog);
    setRating(null);
    setHoverRating(null);
    setLiked(false);
    setReview("");
  }, [open, isRepeatLog, details.id]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await logMedia({
        mediaId: details.id,
        mediaType: details.mediaType,
        title: details.title,
        creator: details.creator,
        year: details.year,
        thumbnail: details.thumbnail,
        loggedOn,
        rating,
        liked,
        isRewatch,
        review,
      });

      if (!result.ok) {
        return;
      }

      onLogged?.();
      onClose();
      router.refresh();
    });
  }

  const displayRating = hoverRating ?? rating ?? 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close log modal"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md overflow-hidden border border-white/10 bg-zinc-950"
      >
        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-zinc-800">
              {details.thumbnail ? (
                <Image
                  src={details.thumbnail}
                  alt=""
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                New diary entry
              </p>
              <h2
                id={titleId}
                className="mt-1 truncate text-lg font-semibold text-white"
              >
                Log {details.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-zinc-400">
              {labels.date}
            </span>
            <input
              type="date"
              required
              value={loggedOn}
              onChange={(e) => setLoggedOn(e.target.value)}
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-white/[0.18]"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-3 border border-white/10 bg-white/[0.03] px-3 py-3">
            <span className="text-sm text-zinc-300">{labels.rewatch}</span>
            <input
              type="checkbox"
              checked={isRewatch}
              onChange={(e) => setIsRewatch(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Rating</span>
              <span className="text-xs text-zinc-500">
                {rating != null ? `${rating} / 5` : "Optional"}
              </span>
            </div>
            <div
              className="flex items-center gap-0.5"
              onMouseLeave={() => setHoverRating(null)}
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const fullValue = star;
                const halfValue = star - 0.5;
                const fill =
                  displayRating >= fullValue
                    ? 1
                    : displayRating >= halfValue
                      ? 0.5
                      : 0;

                return (
                  <div key={star} className="relative h-8 w-8">
                    <button
                      type="button"
                      aria-label={`Rate ${halfValue} stars`}
                      className="absolute inset-y-0 left-0 z-10 w-1/2"
                      onMouseEnter={() => setHoverRating(halfValue)}
                      onFocus={() => setHoverRating(halfValue)}
                      onClick={() =>
                        setRating((prev) =>
                          prev === halfValue ? null : halfValue
                        )
                      }
                    />
                    <button
                      type="button"
                      aria-label={`Rate ${fullValue} stars`}
                      className="absolute inset-y-0 right-0 z-10 w-1/2"
                      onMouseEnter={() => setHoverRating(fullValue)}
                      onFocus={() => setHoverRating(fullValue)}
                      onClick={() =>
                        setRating((prev) =>
                          prev === fullValue ? null : fullValue
                        )
                      }
                    />
                    <ModalStar fill={fill} starId={star} />
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLiked((v) => !v)}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-[13px] font-medium transition-colors",
              liked
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
            )}
            aria-pressed={liked}
          >
            <HeartIcon filled={liked} />
            {liked ? "Liked" : "Like"}
          </button>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-zinc-400">
              Review <span className="text-zinc-600">(optional)</span>
            </span>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              placeholder="What did you think?"
              className="w-full resize-none rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm leading-relaxed text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-white/[0.18]"
            />
          </label>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-md border border-white/10 px-4 py-2.5 text-[13px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-md bg-emerald-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save Log"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalStar({ fill, starId }: { fill: number; starId: number }) {
  const gradId = `log-star-${starId}`;

  return (
    <svg viewBox="0 0 24 24" className="pointer-events-none h-8 w-8" aria-hidden>
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

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="M12 20s-7-4.4-7-9.2C5 7.5 7.2 5.5 9.6 5.5c1.4 0 2.6.7 3.4 1.8.8-1.1 2-1.8 3.4-1.8 2.4 0 4.6 2 4.6 5.3C21 15.6 12 20 12 20z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
