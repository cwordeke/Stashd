"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import NavLink from "@/components/NavLink";
import AuthPromptButtons from "@/components/AuthPromptButtons";
import { Skeleton } from "@/components/LoadingSkeleton";
import { CATEGORY_META } from "@/lib/constants";
import type { HeroSlide } from "@/lib/home-hero";
import { MEDIA_TYPES } from "@/lib/types";
import { cn } from "@/lib/cn";

const ROTATION_MS = 8000;
const FADE_MS = 2200;

interface HomeHeroProps {
  slides: HeroSlide[];
  username?: string;
  signedIn: boolean;
}

export default function HomeHero({
  slides,
  username,
  signedIn,
}: HomeHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex];
  const hasSlides = slides.length > 0;

  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const goToSlide = useCallback(
    (nextIndex: number) => {
      if (nextIndex === activeIndexRef.current || !slides.length) return;
      setActiveIndex(nextIndex);
    },
    [slides.length]
  );

  useEffect(() => {
    if (slides.length <= 1) return;

    const id = window.setInterval(() => {
      const next = (activeIndexRef.current + 1) % slides.length;
      goToSlide(next);
    }, ROTATION_MS);

    return () => window.clearInterval(id);
  }, [slides.length, goToSlide]);

  return (
    <section className="relative min-h-[300px] overflow-hidden sm:min-h-[360px] md:min-h-[420px] lg:min-h-[460px]">
      {hasSlides ? (
        <div className="absolute inset-0 overflow-hidden bg-zinc-950" aria-hidden>
          <div className="hero-zoom-track absolute inset-0">
            {slides.map((slide, index) => (
              <div
                key={`${slide.href}-${index}`}
                className={cn(
                  "absolute inset-0 transition-opacity ease-in-out",
                  index === activeIndex
                    ? "z-20 opacity-100"
                    : "z-10 opacity-0"
                )}
                style={{
                  transitionDuration: `${FADE_MS}ms`,
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <Image
                  src={slide.imageUrl}
                  alt=""
                  fill
                  priority={index < 4}
                  sizes="100vw"
                  className={cn(
                    "object-cover",
                    slide.fit === "poster"
                      ? "object-center"
                      : "object-[center_22%]"
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black"
          aria-hidden
        />
      )}

      <div
        className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/75 to-[#0a0a0b]/20"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b]/90 via-[#0a0a0b]/40 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[inherit] max-w-7xl flex-col justify-end px-4 pb-8 pt-28 sm:px-6 md:pb-10 md:pt-32">
        <h1 className="max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
          {username ? (
            <>Welcome back, {username}</>
          ) : (
            <>Welcome to Stashd</>
          )}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-300 sm:text-[15px]">
          {signedIn
            ? "See what your friends are logging and discover new media."
            : "Your social diary for movies, TV, games, books, and music."}
        </p>

        {!signedIn ? (
          <AuthPromptButtons
            className="mt-5"
            primaryLabel="Create free account"
          />
        ) : null}

        {activeSlide ? (
          <p className="mt-3 text-sm text-zinc-400 transition-opacity duration-500">
            Trending{" "}
            <Link
              href={activeSlide.href}
              className="font-medium text-white transition hover:text-emerald-300"
            >
              {activeSlide.title}
            </Link>
            <span className="text-zinc-600"> · {activeSlide.subtitle}</span>
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2" data-tutorial="hero-categories">
          {MEDIA_TYPES.map((type) => (
            <NavLink
              key={type}
              href={CATEGORY_META[type].href}
              className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[13px] text-zinc-200 backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-black/40 hover:text-white"
            >
              {CATEGORY_META[type].title}
            </NavLink>
          ))}
        </div>

        {slides.length > 1 ? (
          <div className="mt-5 flex items-center gap-1.5">
            {slides.map((slide, index) => (
              <button
                key={`${slide.href}-${index}`}
                type="button"
                aria-label={`Show ${slide.title}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => goToSlide(index)}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  index === activeIndex
                    ? "w-6 bg-emerald-400"
                    : "w-1.5 bg-white/30 hover:bg-white/50"
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function HomeHeroSkeleton() {
  return (
    <section className="relative min-h-[300px] overflow-hidden bg-zinc-950 sm:min-h-[360px] md:min-h-[420px] lg:min-h-[460px]">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="relative mx-auto flex min-h-[inherit] max-w-7xl flex-col justify-end px-4 pb-8 pt-28 sm:px-6 md:pb-10 md:pt-32">
        <Skeleton className="h-9 w-full max-w-sm rounded-md" />
        <Skeleton className="mt-3 h-4 w-full max-w-md rounded-md" />
        <Skeleton className="mt-3 h-4 w-48 rounded-md" />
        <div className="mt-4 flex flex-wrap gap-2">
          {MEDIA_TYPES.map((type) => (
            <Skeleton key={type} className="h-7 w-16 rounded-full" />
          ))}
        </div>
        <div className="mt-5 flex gap-1.5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-1 w-1.5 rounded-full" />
          ))}
        </div>
      </div>
    </section>
  );
}
