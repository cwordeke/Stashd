"use client";

import { useState } from "react";
import Image from "next/image";
import Top4Shelf from "@/components/Top4Shelf";
import { useSearchUI } from "@/context/SearchUIContext";
import { MEDIA_TYPES, type StashShelves } from "@/lib/types";

interface PublicProfileViewProps {
  username: string;
  avatarUrl: string | null;
  shelves: StashShelves;
  isOwner: boolean;
}

export default function PublicProfileView({
  username,
  avatarUrl,
  shelves,
  isOwner,
}: PublicProfileViewProps) {
  const { openSearch } = useSearchUI();
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      window.prompt("Copy this profile URL:", url);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={`${username}'s avatar`}
              width={64}
              height={64}
              className="rounded-full border border-zinc-700"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-xl font-semibold text-white">
              {username.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-500/80">
              {isOwner ? "Your public stash" : "Public stash"}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              @{username}
            </h1>
            <p className="max-w-lg text-sm text-zinc-400">
              Top 4 across movies, TV, games, books, and music.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isOwner ? (
            <button
              type="button"
              onClick={() => openSearch()}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              Edit / Add
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleShare}
            className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            {copied ? "Copied!" : "Share Profile"}
          </button>
        </div>
      </header>

      <div className="space-y-10">
        {MEDIA_TYPES.map((type) => (
          <Top4Shelf
            key={type}
            type={type}
            items={shelves[type]}
            editable={isOwner}
          />
        ))}
      </div>
    </div>
  );
}
