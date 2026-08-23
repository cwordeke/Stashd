"use client";

import Image from "next/image";
import Link from "next/link";
import StashPosterTilt from "@/components/StashPosterTilt";
import type { DiaryEntry } from "@/lib/profile-tabs";
import { mediaDetailPath } from "@/lib/types";

interface ProfileRecentlyLoggedProps {
  entries: DiaryEntry[];
}

/** Last few diary logs as a Top-4-style poster row. */
export default function ProfileRecentlyLogged({
  entries,
}: ProfileRecentlyLoggedProps) {
  const recent = entries.slice(0, 8);

  if (!recent.length) {
    return (
      <section className="w-full space-y-2.5">
        <h3 className="text-sm font-medium text-zinc-400">Recently Logged</h3>
        <p className="text-sm text-zinc-600">No logs yet.</p>
      </section>
    );
  }

  return (
    <section className="w-full space-y-2.5">
      <h3 className="text-sm font-medium text-zinc-400">Recently Logged</h3>

      <div className="stash-poster-scene grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-2.5">
        {recent.map((entry) => {
          const href = mediaDetailPath(entry.mediaType, entry.mediaId);

          return (
            <div key={entry.id} className="group relative">
              <StashPosterTilt href={href} title={entry.title}>
                {entry.thumbnail ? (
                  <Image
                    src={entry.thumbnail}
                    alt={entry.title}
                    fill
                    sizes="(max-width: 768px) 22vw, 110px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center px-1 text-center text-[10px] leading-tight text-zinc-500">
                    {entry.title}
                  </span>
                )}
              </StashPosterTilt>

              <Link
                href={href}
                className="mt-1.5 block truncate text-center text-[11px] text-zinc-500 transition hover:text-zinc-300"
              >
                {formatLoggedOn(entry.loggedOn)}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatLoggedOn(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
