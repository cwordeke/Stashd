"use client";

import Image from "next/image";
import { MEDIA_TYPE_LABELS, type MediaDetails } from "@/lib/types";
import { cn } from "@/lib/cn";
import type { MediaLogState } from "@/lib/media-status";
import { useStash } from "@/context/StashContext";
import StarRating from "@/components/StarRating";
import MediaStatusControls from "@/components/MediaStatusControls";

interface MediaDetailViewProps {
  details: MediaDetails;
  initialRating: number | null;
  initialLog: MediaLogState;
  initialInStash: boolean;
  isAuthenticated: boolean;
}

export default function MediaDetailView({
  details,
  initialRating,
  initialLog,
  initialInStash,
  isAuthenticated,
}: MediaDetailViewProps) {
  const { addToStash, isInStash, isPending, pendingKey, stashReady } =
    useStash();
  // Prefer live stash once loaded; until then use the server-known value
  // so we never flash green → grey for items already stashed.
  const inStash = stashReady ? isInStash(details) : initialInStash;
  const itemKey = `${details.mediaType}:${details.id}`;
  const thisPending = isPending && pendingKey === itemKey;
  const hasBackdrop = Boolean(details.backdropUrl);
  const bannerSrc = details.backdropUrl ?? details.thumbnail;

  return (
    <div className="pb-16">
      {/* Hero banner */}
      <div className="relative h-[48vw] min-h-[250px] max-h-[480px] w-full overflow-hidden bg-zinc-900">
        {bannerSrc ? (
          hasBackdrop ? (
            <Image
              src={bannerSrc}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src={bannerSrc}
                alt=""
                fill
                priority
                sizes="100vw"
                className="scale-125 object-cover opacity-50 blur-3xl"
              />
            </div>
          )
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/70 via-transparent to-zinc-950/40" />
      </div>

      {/* Content overlay — poster floats over banner edge */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="-mt-28 grid gap-8 sm:-mt-32 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10">
          {/* Poster + rating / status / stash */}
          <div className="mx-auto w-40 shrink-0 space-y-3 sm:mx-0 sm:w-44 lg:w-[180px]">
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900 shadow-2xl shadow-black/60">
              {details.thumbnail ? (
                <Image
                  src={details.thumbnail}
                  alt={details.title}
                  fill
                  sizes="180px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                  No poster
                </div>
              )}
            </div>

            <StarRating
              mediaId={details.id}
              mediaType={details.mediaType}
              initialRating={initialRating}
              isAuthenticated={isAuthenticated}
              compact
              mediaMeta={{
                title: details.title,
                creator: details.creator,
                year: details.year,
                thumbnail: details.thumbnail,
              }}
            />

            <MediaStatusControls
              mediaId={details.id}
              mediaType={details.mediaType}
              initialState={initialLog}
              isAuthenticated={isAuthenticated}
              mediaMeta={{
                title: details.title,
                creator: details.creator,
                year: details.year,
                thumbnail: details.thumbnail,
              }}
            />

            <button
              type="button"
              onClick={() => addToStash(details)}
              disabled={inStash || thisPending}
              className={cn(
                "w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                inStash
                  ? "cursor-default bg-zinc-800 text-zinc-500"
                  : "bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
              )}
            >
              {inStash
                ? "In Stash"
                : thisPending
                  ? "Saving…"
                  : "Add to Stash"}
            </button>
          </div>

          {/* Title + description */}
          <div className="min-w-0 space-y-4 pt-2 lg:pt-32">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-emerald-500/80">
                {MEDIA_TYPE_LABELS[details.mediaType]}
              </p>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {details.title}
              </h1>
              <p className="mt-2 text-sm text-zinc-400 sm:text-base">
                <span className="text-zinc-300">{details.year}</span>
                {details.creator && details.creator !== "—" ? (
                  <>
                    {" "}
                    ·{" "}
                    <span>
                      {details.mediaType === "movie"
                        ? "Directed by "
                        : details.mediaType === "book"
                          ? "By "
                          : details.mediaType === "music"
                            ? ""
                            : ""}
                      <span className="text-zinc-200">{details.creator}</span>
                    </span>
                  </>
                ) : null}
              </p>
            </div>

            {details.tagline ? (
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {details.tagline}
              </p>
            ) : null}

            <p className="max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-[15px]">
              {details.description?.trim() ||
                "No description available for this title yet."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
