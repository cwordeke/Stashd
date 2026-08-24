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
    active: true,
  },
  {
    id: "goodreads",
    name: "Goodreads",
    description: "Bring over your books, shelves, and ratings.",
    active: false,
  },
  {
    id: "steam",
    name: "Steam",
    description: "Sync games you’ve played from your Steam library.",
    active: false,
  },
  {
    id: "spotify",
    name: "Spotify",
    description: "Import albums you’ve saved and listened to.",
    active: false,
  },
] as const;

export default function ImportHub() {
  const [letterboxdOpen, setLetterboxdOpen] = useState(false);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {INTEGRATIONS.map((integration) => {
          const active = integration.active;

          return (
            <button
              key={integration.id}
              type="button"
              disabled={!active}
              onClick={() => {
                if (integration.id === "letterboxd") setLetterboxdOpen(true);
              }}
              aria-disabled={!active}
              className={cn(
                "flex flex-col items-start gap-4 border border-white/10 bg-zinc-900/50 p-5 text-left transition-colors",
                active
                  ? "hover:border-white/20 hover:bg-zinc-900"
                  : "cursor-not-allowed opacity-55"
              )}
            >
              <div className="flex w-full items-start justify-between gap-3">
                {integration.id === "letterboxd" ? (
                  <Image
                    src="/letterboxd-logo.svg"
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0"
                    unoptimized
                  />
                ) : (
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md",
                      integration.id === "goodreads" &&
                        "bg-amber-500/15 text-amber-400",
                      integration.id === "steam" &&
                        "bg-sky-500/15 text-sky-400",
                      integration.id === "spotify" &&
                        "bg-green-500/15 text-green-400"
                    )}
                  >
                    <IntegrationGlyph id={integration.id} />
                  </span>
                )}
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
            </button>
          );
        })}
      </div>

      <LetterboxdImportModal
        open={letterboxdOpen}
        onClose={() => setLetterboxdOpen(false)}
      />
    </>
  );
}

function IntegrationGlyph({
  id,
}: {
  id: Exclude<(typeof INTEGRATIONS)[number]["id"], "letterboxd">;
}) {
  const className = "h-5 w-5";

  if (id === "goodreads") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path
          d="M6 4.5h9.5A2.5 2.5 0 0 1 18 7v12.5H8A2 2 0 0 1 6 17.5v-13Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M6 4.5A2 2 0 0 0 4 6.5v11A2 2 0 0 0 6 19.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (id === "steam") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <rect
          x="3.5"
          y="8.5"
          width="17"
          height="9"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M8 8.5V7a4 4 0 0 1 8 0v1.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="9.5" cy="13" r="1" fill="currentColor" />
        <circle cx="14.5" cy="13" r="1" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 9.5v5l4.5-2.5L10 9.5Z" fill="currentColor" />
    </svg>
  );
}
