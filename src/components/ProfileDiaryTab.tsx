"use client";

import Image from "next/image";
import Link from "next/link";
import DisplayStars from "@/components/DisplayStars";
import type { DiaryEntry } from "@/lib/profile-tabs";
import {
  MEDIA_TYPE_LABELS,
  mediaDetailPath,
} from "@/lib/types";

interface ProfileDiaryTabProps {
  entries: DiaryEntry[];
}

interface DiaryGroup {
  key: string;
  label: string;
  entries: DiaryEntry[];
}

export default function ProfileDiaryTab({ entries }: ProfileDiaryTabProps) {
  if (!entries.length) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-6 py-14 text-center">
        <p className="text-sm font-medium text-zinc-200">
          No diary entries logged yet.
        </p>
        <p className="mt-1.5 text-sm text-zinc-500">
          When you log media, it will appear here by date.
        </p>
      </div>
    );
  }

  const groups = groupByMonth(entries);

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.key} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {group.label}
          </h3>

          <ul className="divide-y divide-zinc-800/80 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30">
            {group.entries.map((entry) => (
              <DiaryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function DiaryRow({ entry }: { entry: DiaryEntry }) {
  const date = parseLoggedOn(entry.loggedOn);
  const dayNum = date ? String(date.getUTCDate()) : "—";
  const weekday = date
    ? date.toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC",
      })
    : "";

  return (
    <li>
      <Link
        href={mediaDetailPath(entry.mediaType, entry.mediaId)}
        className="flex items-center gap-3 px-3 py-3 transition hover:bg-zinc-900/80 sm:gap-4 sm:px-4"
      >
        <div className="w-10 shrink-0 text-center">
          <p className="text-lg font-semibold leading-none text-zinc-100">
            {dayNum}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
            {weekday}
          </p>
        </div>

        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-zinc-800 sm:h-16 sm:w-11">
          {entry.thumbnail ? (
            <Image
              src={entry.thumbnail}
              alt=""
              fill
              sizes="44px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[9px] text-zinc-600">
              N/A
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-medium text-zinc-100">
              {entry.title}
            </h4>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              {MEDIA_TYPE_LABELS[entry.mediaType].replace(/s$/, "")}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">{entry.year}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {entry.rating != null ? <DisplayStars rating={entry.rating} /> : null}
          {entry.liked ? (
            <span className="text-emerald-400" aria-label="Liked">
              <HeartIcon />
            </span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

function groupByMonth(entries: DiaryEntry[]): DiaryGroup[] {
  const map = new Map<string, DiaryGroup>();

  for (const entry of entries) {
    const date = parseLoggedOn(entry.loggedOn);
    const key = date
      ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
      : "unknown";
    const label = date
      ? date
          .toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })
          .toUpperCase()
      : "UNKNOWN";

    const group = map.get(key) ?? { key, label, entries: [] };
    group.entries.push(entry);
    map.set(key, group);
  }

  return Array.from(map.values());
}

function parseLoggedOn(value: string): Date | null {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="M12 20s-7-4.4-7-9.2C5 7.5 7.2 5.5 9.6 5.5c1.4 0 2.6.7 3.4 1.8.8-1.1 2-1.8 3.4-1.8 2.4 0 4.6 2 4.6 5.3C21 15.6 12 20 12 20z"
        fill="currentColor"
      />
    </svg>
  );
}
