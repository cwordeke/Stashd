"use client";

export default function ProfileListsTab() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-16 text-center">
      <p className="text-sm font-medium text-zinc-200">No custom lists yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
        Create themed lists for festivals, genres, or anything you want to track.
        This section is ready for future list features.
      </p>
      <button
        type="button"
        disabled
        className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-400"
      >
        Create a Custom List
      </button>
      <div className="mx-auto mt-10 grid max-w-2xl gap-3 sm:grid-cols-2">
        {["Favorites of 2026", "Rainy Day Reads"].map((name) => (
          <div
            key={name}
            className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-5 text-left opacity-40"
          >
            <p className="text-sm font-medium text-zinc-300">{name}</p>
            <p className="mt-1 text-xs text-zinc-600">0 titles · placeholder</p>
          </div>
        ))}
      </div>
    </div>
  );
}
