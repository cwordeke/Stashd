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
      <div className="border border-white/10 bg-zinc-900/50 p-8">
        <div className="mb-8 space-y-2 text-center">
          <Link
            href="/"
            className="text-[17px] font-bold tracking-[-0.035em] text-white"
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
            <div className="flex overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.04] focus-within:border-white/[0.18]">
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
            className="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Claiming…" : "Claim username"}
          </button>
        </form>
      </div>
    </div>
  );
}
