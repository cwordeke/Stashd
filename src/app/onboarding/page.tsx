"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { claimUsername } from "@/app/actions/profile";

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await claimUsername(username);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      router.replace(`/u/${result.profile.username}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl shadow-black/40">
        <div className="mb-8 space-y-2 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
          >
            Stashd
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Claim your username
          </h1>
          <p className="text-sm text-zinc-400">
            Pick a unique handle so friends can find your stash at{" "}
            <span className="text-zinc-300">stashd.app/u/you</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Username
            </span>
            <div className="flex overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/30">
              <span className="flex items-center border-r border-zinc-800 px-3 text-sm text-zinc-500">
                /u/
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
                }
                placeholder="cyberfan"
                autoComplete="username"
                autoFocus
                maxLength={24}
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
              />
            </div>
          </label>

          <p className="text-xs text-zinc-500">
            Letters, numbers, and underscores only. 3–24 characters.
          </p>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={isPending || username.trim().length < 3}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Claiming…" : "Claim username"}
          </button>
        </form>
      </div>
    </div>
  );
}
