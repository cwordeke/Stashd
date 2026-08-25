"use client";

import Image from "next/image";
import { useState } from "react";
import LetterboxdImportModal from "@/components/LetterboxdImportModal";
import { cn } from "@/lib/cn";

const INTEGRATIONS = [
  {
    id: "letterboxd",
    name: "Letterboxd",
    description:
      "Import watched films and star ratings from a Letterboxd zip export.",
    icon: "/letterboxd-logo.svg",
    href: null,
    active: true,
  },
  {
    id: "goodreads",
    name: "Goodreads",
    description: "Bring over your books, shelves, and ratings.",
    icon: "/goodreadsIcon.png",
    href: null,
    active: false,
  },
  {
    id: "steam",
    name: "Steam",
    description: "Sync games you’ve played from your Steam library.",
    icon: "/steamIcon.png",
    href: null,
    active: false,
  },
  {
    id: "spotify",
    name: "Spotify",
    description:
      "One-time import of saved albums as Listened. Not a live connection.",
    icon: "/spotifyIcon.png",
    href: "/api/spotify/login",
    active: true,
  },
] as const;

interface ImportHubProps {
  spotifyStatus?: "success" | "error" | null;
}

export default function ImportHub({
  spotifyStatus = null,
}: ImportHubProps) {
  const [letterboxdOpen, setLetterboxdOpen] = useState(false);

  return (
    <div className="space-y-4">
      {spotifyStatus === "success" ? (
        <p className="text-sm text-emerald-400">
          Imported your Spotify saved albums as Listened. They show as Listened
          on album pages and can feed recommendations. They won’t appear in
          Stash unless you rate or like them.
        </p>
      ) : null}
      {spotifyStatus === "error" ? (
        <p className="text-sm text-red-400">
          Couldn’t connect to Spotify. Try again, or allow access when prompted.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {INTEGRATIONS.map((integration) => {
          const active = integration.active;
          const cardClass = cn(
            "flex flex-col items-start gap-4 border border-white/10 bg-zinc-900/50 p-5 text-left transition-colors",
            active
              ? "hover:border-white/20 hover:bg-zinc-900"
              : "cursor-not-allowed opacity-55"
          );

          const body = (
            <>
              <div className="flex w-full items-start justify-between gap-3">
                <Image
                  src={integration.icon}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized={integration.icon.endsWith(".svg")}
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-full",
                    integration.id === "spotify"
                      ? "object-cover"
                      : "object-contain"
                  )}
                />
                {active ? (
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-400">
                    Available
                  </span>
                ) : (
                  <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                    Coming Soon
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-white">
                  {integration.name}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  {integration.description}
                </p>
              </div>
            </>
          );

          if (active && integration.href) {
            return (
              <a
                key={integration.id}
                href={integration.href}
                className={cardClass}
              >
                {body}
              </a>
            );
          }

          return (
            <button
              key={integration.id}
              type="button"
              disabled={!active}
              onClick={() => {
                if (integration.id === "letterboxd") setLetterboxdOpen(true);
              }}
              aria-disabled={!active}
              className={cardClass}
            >
              {body}
            </button>
          );
        })}
      </div>

      <LetterboxdImportModal
        open={letterboxdOpen}
        onClose={() => setLetterboxdOpen(false)}
      />
    </div>
  );
}
