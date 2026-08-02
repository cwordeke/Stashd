"use client";

import Top4Shelf from "@/components/Top4Shelf";
import { useSearchUI } from "@/context/SearchUIContext";
import { MEDIA_TYPES, type StashShelves } from "@/lib/types";

interface ProfileClientProps {
  shelves: StashShelves;
}

export default function ProfileClient({ shelves }: ProfileClientProps) {
  const { openSearch } = useSearchUI();

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-500/80">
            Profile
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            My Stash
          </h1>
          <p className="max-w-lg text-sm text-zinc-400">
            Your Top 4 across every medium. Empty slots open search pre-filtered
            to that category. Saved to your account via Supabase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openSearch()}
          className="self-start rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
        >
          Open Search
        </button>
      </header>

      <div className="space-y-10">
        {MEDIA_TYPES.map((type) => (
          <Top4Shelf key={type} type={type} items={shelves[type]} />
        ))}
      </div>
    </div>
  );
}
