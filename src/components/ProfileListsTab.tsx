"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ListPosterCollage from "@/components/ListPosterCollage";
import EmptyState from "@/components/EmptyState";
import type { ListSummary } from "@/lib/profile-tabs";
import { cn } from "@/lib/cn";

type VisibilityFilter = "all" | "public" | "private";
type SortKey = "updated" | "name" | "count";

interface ProfileListsTabProps {
  username: string;
  lists: ListSummary[];
  isOwner: boolean;
}

export default function ProfileListsTab({
  username,
  lists,
  isOwner,
}: ProfileListsTabProps) {
  const [filter, setFilter] = useState<VisibilityFilter>("all");
  const [sort, setSort] = useState<SortKey>("updated");

  const visible = useMemo(() => {
    let rows = [...lists];
    if (isOwner && filter === "public") {
      rows = rows.filter((l) => l.isPublic);
    } else if (isOwner && filter === "private") {
      rows = rows.filter((l) => !l.isPublic);
    }

    rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "count") return b.itemCount - a.itemCount;
      return (
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
    return rows;
  }, [lists, filter, sort, isOwner]);

  if (!lists.length) {
    return (
      <EmptyState
        illustration="empty-stash"
        title="No lists yet"
        description="Create themed lists for festivals, genres, rankings, or anything you want to track across movies, TV, games, books, and music."
      >
        {isOwner ? (
          <Link
            href={`/u/${username}/lists/new`}
            className="inline-flex rounded-md bg-emerald-600 px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Create a custom list
          </Link>
        ) : null}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-100">
            {isOwner ? "Your lists" : "Lists"}
          </h2>
          {isOwner ? (
            <Link
              href={`/u/${username}/lists/new`}
              className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
            >
              + New list
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOwner ? (
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="sr-only">Filter</span>
              <select
                value={filter}
                onChange={(e) =>
                  setFilter(e.target.value as VisibilityFilter)
                }
                className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-white/[0.18]"
              >
                <option value="all">Show all</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="sr-only">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-white/[0.18]"
            >
              <option value="updated">Sort by when updated</option>
              <option value="name">Sort by name</option>
              <option value="count">Sort by size</option>
            </select>
          </label>
        </div>
      </div>

      <ul className="divide-y divide-zinc-800/90">
        {visible.map((list) => (
          <li key={list.id}>
            <div className="flex items-center gap-4 py-4 sm:gap-5">
              <Link
                href={`/u/${username}/lists/${list.id}`}
                className="shrink-0 transition hover:opacity-90"
              >
                <ListPosterCollage thumbnails={list.previewThumbnails} />
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <Link
                    href={`/u/${username}/lists/${list.id}`}
                    className="truncate text-lg font-semibold text-zinc-50 transition hover:text-emerald-300"
                  >
                    {list.name}
                  </Link>
                  {!list.isPublic ? (
                    <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                      Private
                    </span>
                  ) : null}
                  {list.isRanked ? (
                    <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                      Ranked
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
                  <span>
                    {list.itemCount}{" "}
                    {list.itemCount === 1 ? "title" : "titles"}
                  </span>
                  {isOwner ? (
                    <Link
                      href={`/u/${username}/lists/${list.id}/edit`}
                      className="inline-flex items-center text-zinc-500 transition hover:text-emerald-400"
                      aria-label={`Edit ${list.name}`}
                      title="Edit list"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>
                {list.tags.length ? (
                  <p className="mt-1.5 truncate text-xs text-zinc-600">
                    {list.tags.map((t) => `#${t}`).join(" ")}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!visible.length ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          No lists match this filter.
        </p>
      ) : null}
    </div>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={cn(className)}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 3.487a2.1 2.1 0 0 1 2.97 2.97L8.25 18.04 3 19.5l1.46-5.25L16.862 3.487z"
      />
    </svg>
  );
}
