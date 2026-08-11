"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { createClient } from "@/utils/supabase/client";
import { useNavigationPending } from "@/context/NavigationPendingContext";

interface ProfileSettingsProps {
  username: string;
  className?: string;
}

export default function ProfileSettings({
  username,
  className,
}: ProfileSettingsProps) {
  const router = useRouter();
  const { beginNavigation } = useNavigationPending();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const root = rootRef.current;
      if (!root) return;
      const target = event.target as Node | null;
      if (target && !root.contains(target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    beginNavigation("/");
    router.push("/");
    router.refresh();
    setSigningOut(false);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        title="Settings"
        className={cn(
          "group relative inline-flex h-10 w-10 items-center justify-center rounded-full",
          "border border-zinc-700/70 bg-zinc-950/70 text-zinc-400",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_8px_24px_-12px_rgba(0,0,0,0.8)]",
          "backdrop-blur-md transition duration-300",
          "hover:border-emerald-500/40 hover:text-emerald-300",
          "hover:shadow-[0_0_0_1px_rgba(16,185,129,0.12)_inset,0_10px_28px_-10px_rgba(16,185,129,0.25)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
          open &&
            "border-emerald-500/45 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.16)_inset,0_10px_28px_-10px_rgba(16,185,129,0.28)]"
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute inset-0 rounded-full opacity-0 transition duration-300",
            "bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.18),transparent_55%)]",
            "group-hover:opacity-100",
            open && "opacity-100"
          )}
          aria-hidden
        />
        <SettingsGlyph
          className={cn(
            "relative h-[18px] w-[18px] transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open && "rotate-90"
          )}
        />
      </button>

      <div
        id={panelId}
        role="dialog"
        aria-label="Profile settings"
        aria-hidden={!open}
        className={cn(
          "absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(18.5rem,calc(100vw-2rem))] origin-top-right",
          "transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-[0.97] opacity-0"
        )}
      >
        <div
          className={cn(
            "overflow-hidden rounded-2xl border border-zinc-700/80",
            "bg-zinc-950/95 shadow-2xl shadow-black/60 backdrop-blur-xl"
          )}
        >
          <div className="relative border-b border-zinc-800/90 px-4 py-3.5">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"
              aria-hidden
            />
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              Account
            </p>
            <p className="mt-1 truncate text-sm font-medium text-white">
              @{username}
            </p>
          </div>

          <div className="space-y-1 p-2">
            <div className="rounded-xl px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-600">
                Profile
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                Public page for your stash, diary, and ratings.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left",
                "text-sm text-zinc-300 transition",
                "hover:bg-zinc-900 hover:text-white",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <span>{signingOut ? "Signing out…" : "Sign out"}</span>
              <SignOutGlyph className="h-4 w-4 shrink-0 text-zinc-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M19.4 13.1c.05-.36.05-.74 0-1.1l1.7-1.3a.5.5 0 0 0 .12-.64l-1.6-2.8a.5.5 0 0 0-.6-.22l-2 .8a7.4 7.4 0 0 0-.95-.55l-.3-2.1a.5.5 0 0 0-.5-.42h-3.2a.5.5 0 0 0-.5.42l-.3 2.1c-.33.14-.65.33-.95.55l-2-.8a.5.5 0 0 0-.6.22l-1.6 2.8a.5.5 0 0 0 .12.64l1.7 1.3c-.05.36-.05.74 0 1.1l-1.7 1.3a.5.5 0 0 0-.12.64l1.6 2.8a.5.5 0 0 0 .6.22l2-.8c.3.22.62.41.95.55l.3 2.1a.5.5 0 0 0 .5.42h3.2a.5.5 0 0 0 .5-.42l.3-2.1c.33-.14.65-.33.95-.55l2 .8a.5.5 0 0 0 .6-.22l1.6-2.8a.5.5 0 0 0-.12-.64l-1.7-1.3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SignOutGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M10 7V6.2A2.2 2.2 0 0 1 12.2 4h5.6A2.2 2.2 0 0 1 20 6.2v11.6A2.2 2.2 0 0 1 17.8 20h-5.6A2.2 2.2 0 0 1 10 17.8V17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M15 12H4m0 0 3-3m-3 3 3 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
