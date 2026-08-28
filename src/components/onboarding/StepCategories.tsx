"use client";

import { motion } from "framer-motion";
import BrandIllustration from "@/components/BrandIllustration";
import { cn } from "@/lib/cn";
import { MEDIA_TYPES, type MediaType } from "@/lib/types";

const CATEGORY_COPY: Record<MediaType, { label: string; blurb: string }> = {
  movie: { label: "Movies", blurb: "Films, from blockbusters to deep cuts" },
  tv: { label: "TV Shows", blurb: "Series you actually finish" },
  game: {
    label: "Video Games",
    blurb: "Played, beating, or forever in the backlog",
  },
  book: { label: "Books", blurb: "Novels, comics, and everything in between" },
  music: { label: "Music", blurb: "Albums that stay on repeat" },
};

interface StepCategoriesProps {
  ranked: MediaType[];
  onToggle: (type: MediaType) => void;
  error: string | null;
  onContinue: () => void;
}

export default function StepCategories({
  ranked,
  onToggle,
  error,
  onContinue,
}: StepCategoriesProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-4 text-center sm:space-y-5">
        <BrandIllustration id="five-media" size="md" className="mx-auto" />
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            What are your favorites?
          </h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            Pick the kinds of media you care about most — we&apos;ll personalize
            your feed and nav.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MEDIA_TYPES.map((type) => {
          const rank = ranked.indexOf(type) + 1;
          const active = rank > 0;
          const copy = CATEGORY_COPY[type];
          return (
            <motion.button
              key={type}
              type="button"
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 520, damping: 28 }}
              onClick={() => onToggle(type)}
              aria-pressed={active}
              className={cn(
                "flex items-start gap-3 border p-4 text-left transition-colors",
                active
                  ? "border-emerald-400/50 bg-emerald-500/10"
                  : "border-white/10 bg-zinc-950/50 hover:border-white/20"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border text-sm font-semibold",
                  active
                    ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                    : "border-white/10 bg-white/[0.03] text-zinc-400"
                )}
              >
                {active ? rank : <CategoryGlyph type={type} />}
              </span>
              <span>
                <span className="block text-[14px] font-medium text-white">
                  {copy.label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                  {copy.blurb}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onContinue}
        disabled={ranked.length === 0}
        className="w-full bg-emerald-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue
      </button>
    </div>
  );
}

function CategoryGlyph({ type }: { type: MediaType }) {
  const className = "h-4 w-4";
  if (type === "movie") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <rect x="3.5" y="6" width="17" height="12" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 6v12M16 6v12M3.5 10h17M3.5 14h17" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  if (type === "tv") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <rect x="3.5" y="7" width="17" height="11" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 18.5h6M12 7 9 4.5M12 7l3-2.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === "game") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path
          d="M7 8.5h10c2.2 0 3.5 2.2 2.8 4.3l-.8 2.4c-.4 1.2-1.6 2-2.9 2H8c-1.3 0-2.5-.8-2.9-2l-.8-2.4C3.5 10.7 4.8 8.5 7 8.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M8.5 12h3M10 10.5v3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="15.2" cy="11.3" r="0.8" fill="currentColor" />
        <circle cx="16.6" cy="13.1" r="0.8" fill="currentColor" />
      </svg>
    );
  }
  if (type === "book") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path
          d="M6 5h10.5A1.5 1.5 0 0 1 18 6.5V19H8A2 2 0 0 1 6 17V5Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M6 5a2 2 0 0 0-2 2v10" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
