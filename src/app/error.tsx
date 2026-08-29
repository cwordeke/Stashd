"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7 text-red-400"
          fill="none"
          aria-hidden
        >
          <path
            d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">
          Something went wrong
        </h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          An unexpected error occurred. You can try again or head back to the
          home page.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-md bg-emerald-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-500"
        >
          Try again
        </button>
        <Link
          href="/"
          className="min-h-11 rounded-md border border-white/10 px-4 py-2.5 text-[13px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
