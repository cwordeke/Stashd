"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { importSteamLibrary } from "@/app/actions/steam";
import { cn } from "@/lib/cn";

type ModalPhase = "idle" | "importing" | "complete";

interface SteamImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (imported: number) => void;
}

export default function SteamImportModal({
  open,
  onClose,
  onSuccess,
}: SteamImportModalProps) {
  const router = useRouter();
  const titleId = useId();
  const inputId = useId();

  const [phase, setPhase] = useState<ModalPhase>("idle");
  const [userInput, setUserInput] = useState("");
  const [imported, setImported] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const importing = phase === "importing";

  const reset = useCallback(() => {
    setPhase("idle");
    setUserInput("");
    setImported(0);
    setSkipped(0);
    setTotal(0);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !importing) onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, reset, importing]);

  if (!open) return null;

  function handleClose() {
    if (importing) return;
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (importing) return;

    const trimmed = userInput.trim();
    if (!trimmed) {
      setError("Enter your Steam ID or custom profile URL.");
      return;
    }

    setError(null);
    setPhase("importing");

    const result = await importSteamLibrary(trimmed);

    if (!result.ok) {
      setPhase("idle");
      setError(result.message);
      return;
    }

    setImported(result.imported);
    setSkipped(result.skipped);
    setTotal(result.total);
    setPhase("complete");
    router.refresh();

    if (result.imported > 0) {
      onSuccess?.(result.imported);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close import modal"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={handleClose}
        disabled={importing}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-lg overflow-hidden border border-white/10 bg-zinc-950"
      >
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Image
                src="/steamIcon.png"
                alt=""
                width={40}
                height={40}
                className="mt-0.5 h-10 w-10 shrink-0 rounded-full object-contain"
              />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Steam
                </p>
                <h2
                  id={titleId}
                  className="mt-1 text-lg font-semibold text-white"
                >
                  Import games
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={importing}
              className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200 disabled:opacity-40"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {phase === "idle" || phase === "importing" ? (
            <>
              <p className="text-sm leading-relaxed text-zinc-400">
                Enter your Steam ID or custom profile URL. We&apos;ll import
                games you&apos;ve played (with playtime) and match them to IGDB
                for cover art.
              </p>

              <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor={inputId}
                    className="text-[13px] font-medium text-zinc-300"
                  >
                    Steam ID or Custom Profile URL
                  </label>
                  <input
                    id={inputId}
                    type="text"
                    value={userInput}
                    onChange={(event) => setUserInput(event.target.value)}
                    placeholder="76561198000000000 or steamcommunity.com/id/yourname"
                    disabled={importing}
                    autoComplete="off"
                    className={cn(
                      "w-full border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600",
                      "focus:border-white/20 focus:outline-none disabled:opacity-60"
                    )}
                  />
                </div>

                {importing ? (
                  <div className="space-y-2">
                    <p className="text-sm text-zinc-200">
                      Fetching your library and matching games…
                    </p>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div className="h-full w-1/3 animate-pulse bg-emerald-500" />
                    </div>
                    <p className="text-xs text-zinc-500">
                      Large libraries can take a minute or two.
                    </p>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-md border border-white/10 px-4 py-2.5 text-[13px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.05]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-md bg-emerald-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-500"
                    >
                      Fetch Library
                    </button>
                  </div>
                )}
              </form>
            </>
          ) : null}

          {phase === "complete" ? (
            <div className="space-y-3">
              <p className="text-sm text-emerald-400">
                {imported === 0
                  ? "No games could be matched to IGDB."
                  : `Imported ${imported} ${imported === 1 ? "game" : "games"}.`}
              </p>
              {total > 0 ? (
                <p className="text-xs text-zinc-500">
                  {imported} of {total} played games matched
                  {skipped > 0 ? ` (${skipped} skipped)` : ""}.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  reset();
                }}
                className="text-[13px] font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              >
                Import another profile
              </button>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md border border-white/10 px-4 py-2.5 text-[13px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.05]"
                >
                  Done
                </button>
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
