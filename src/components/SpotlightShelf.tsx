"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MediaCard from "@/components/MediaCard";
import { MediaCardSkeleton } from "@/components/LoadingSkeleton";
import { cn } from "@/lib/cn";
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(maxScroll > 4 && el.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateArrows)
        : null;
    ro?.observe(el);

    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
      ro?.disconnect();
    };
  }, [updateArrows, items.length]);

  function scrollByPage(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.85, 220);
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

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
        <div className="relative">
          <div
            ref={scrollerRef}
            className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:-mx-0 sm:px-0"
          >
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

          <CarouselArrow
            direction="left"
            disabled={!canLeft}
            onClick={() => scrollByPage(-1)}
            className="absolute inset-y-0 left-0 z-10"
          />
          <CarouselArrow
            direction="right"
            disabled={!canRight}
            onClick={() => scrollByPage(1)}
            className="absolute inset-y-0 right-0 z-10"
          />
        </div>
      )}
    </section>
  );
}

function CarouselArrow({
  direction,
  disabled,
  onClick,
  className,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-hidden={disabled}
      tabIndex={disabled ? -1 : 0}
      aria-label={direction === "left" ? "Previous" : "Next"}
      className={cn(
        "flex w-9 items-center justify-center sm:w-10",
        "bg-zinc-950/35 text-zinc-100 backdrop-blur-[2px]",
        "transition-[opacity,background-color] duration-500 ease-out",
        "hover:bg-zinc-950/50",
        disabled
          ? "pointer-events-none opacity-0"
          : "pointer-events-auto opacity-100",
        className
      )}
    >
      <ArrowIcon direction={direction} />
    </button>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d={
          direction === "left"
            ? "M14.5 5.5L8 12l6.5 6.5"
            : "M9.5 5.5L16 12l-6.5 6.5"
        }
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
