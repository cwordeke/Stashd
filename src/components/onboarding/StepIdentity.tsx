"use client";

import { useEffect, useRef, useState } from "react";
import BrandIllustration from "@/components/BrandIllustration";
import { checkUsernameAvailable } from "@/app/actions/onboarding";
import { cn } from "@/lib/cn";
import {
  USERNAME_MAX_LEN,
  USERNAME_MIN_LEN,
  validateUsername,
} from "@/lib/username";

interface StepIdentityProps {
  username: string;
  onUsernameChange: (value: string) => void;
  error: string | null;
  busy: boolean;
  onContinue: () => void;
}

export default function StepIdentity({
  username,
  onUsernameChange,
  error,
  busy,
  onContinue,
}: StepIdentityProps) {
  const [hint, setHint] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setHint(null);
      return;
    }

    const formatError = validateUsername(trimmed);
    if (formatError) {
      setHint(formatError);
      return;
    }

    setHint(null);
    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      void checkUsernameAvailable(trimmed).then((result) => {
        if (id !== requestId.current) return;
        setHint(result.available ? null : result.message);
      });
    }, 320);

    return () => window.clearTimeout(timer);
  }, [username]);

  const displayError = error ?? hint;
  const canContinue =
    !busy && validateUsername(username) === null && !hint;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-4 text-center sm:space-y-5">
        <BrandIllustration id="five-media" size="md" className="mx-auto" priority />
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Enter your username
          </h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            This is your public handle. Friends will find your stash here.
          </p>
        </div>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Username
        </span>
        <input
          type="text"
          value={username}
          onChange={(e) =>
            onUsernameChange(
              e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
            )
          }
          autoComplete="username"
          autoFocus
          maxLength={USERNAME_MAX_LEN}
          className={cn(
            "w-full border bg-white/[0.04] px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/[0.18]",
            displayError ? "border-red-500/40" : "border-white/[0.08]"
          )}
        />
      </label>

      <p className="text-xs text-zinc-500">
        Letters, numbers, and underscores only. {USERNAME_MIN_LEN}–
        {USERNAME_MAX_LEN} characters.
      </p>

      {displayError ? (
        <p role="alert" className="text-sm text-red-400">
          {displayError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className="w-full bg-emerald-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Checking…" : "Continue"}
      </button>
    </div>
  );
}
