"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import DisplayStars from "@/components/DisplayStars";
import ListPosterCollage from "@/components/ListPosterCollage";
import type { MediaList } from "@/lib/profile-tabs";
import {
  MEDIA_TYPE_LABELS,
  mediaDetailPath,
} from "@/lib/types";
import { cn } from "@/lib/cn";

interface ListDetailViewProps {
  list: MediaList;
  isOwner: boolean;
}

export default function ListDetailView({ list, isOwner }: ListDetailViewProps) {
  const [view, setView] = useState<"list" | "grid">("list");
  const thumbs = useMemo(
    () => list.items.slice(0, 5).map((item) => item.thumbnail),
    [list.items]
  );
  const countLabel = `${list.items.length} ${
    list.items.length === 1 ? "title" : "titles"
  }`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Link
        href={`/u/${list.username}?tab=lists`}
        className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500 transition hover:text-zinc-300"
      >
        ← {list.username}&apos;s lists
      </Link>

      <header className="mt-5 flex flex-col gap-5 border-b border-zinc-800 pb-6 sm:flex-row sm:items-start">
        <ListPosterCollage
          thumbnails={thumbs}
          className="h-24 w-52 sm:h-28 sm:w-60"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
                {list.name}
              </h1>
              <p className="mt-1.5 text-sm text-zinc-500">
                A list by{" "}
                <Link
                  href={`/u/${list.username}`}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  {list.username}
                </Link>
                {" · "}
                {countLabel}
                {!list.isPublic ? " · Private" : ""}
                {list.isRanked ? " · Ranked" : ""}
              </p>
            </div>
            {isOwner ? (
              <Link
                href={`/u/${list.username}/lists/${list.id}/edit`}
                className="rounded-md border border-white/10 px-3 py-2 text-[13px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]"
              >
                Edit list
              </Link>
            ) : null}
          </div>

          {list.tags.length ? (
            <p className="mt-3 flex flex-wrap gap-2">
              {list.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-xs text-zinc-400"
                >
                  #{tag}
                </span>
              ))}
            </p>
          ) : null}

          {list.description ? (
            <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
              {list.description}
            </p>
          ) : null}
        </div>
      </header>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">{countLabel}</p>
        <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              view === "list"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              view === "grid"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Grid
          </button>
        </div>
      </div>

      {!list.items.length ? (
        <div className="mt-8 border border-dashed border-white/10 px-6 py-14 text-center text-sm text-zinc-500">
          This list is empty.
        </div>
      ) : view === "grid" ? (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {list.items.map((item, index) => (
            <li key={item.id}>
              <Link
                href={mediaDetailPath(item.mediaType, item.mediaId)}
                className="group block overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70 transition hover:border-zinc-600"
              >
                <div className="relative aspect-[2/3] bg-zinc-800">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      fill
                      sizes="160px"
                      className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : null}
                  {list.isRanked ? (
                    <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1 px-2.5 py-2.5">
                  <p className="truncate text-sm font-medium text-zinc-100">
                    {item.title}
                  </p>
                  {item.rating != null ? (
                    <DisplayStars rating={item.rating} size="sm" />
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-6 divide-y divide-white/[0.06] overflow-hidden border border-white/10">
          {list.items.map((item, index) => (
            <li key={item.id}>
              <Link
                href={mediaDetailPath(item.mediaType, item.mediaId)}
                className="flex items-start gap-3 px-3 py-3.5 transition hover:bg-zinc-900/80 sm:gap-4 sm:px-4"
              >
                {list.isRanked ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-lg font-semibold text-zinc-100">
                    {index + 1}
                  </div>
                ) : null}
                <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-zinc-800">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-100">
                    {item.title}
                    {item.year && item.year !== "—" ? (
                      <span className="ml-1.5 text-sm font-normal text-zinc-500">
                        {item.year}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {MEDIA_TYPE_LABELS[item.mediaType]}
                    {item.creator && item.creator !== "—"
                      ? ` · ${item.creator}`
                      : ""}
                  </p>
                  {item.rating != null ? (
                    <div className="mt-1.5">
                      <DisplayStars rating={item.rating} size="sm" />
                    </div>
                  ) : null}
                  {item.notes ? (
                    <p className="mt-2 text-sm text-zinc-400">{item.notes}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
