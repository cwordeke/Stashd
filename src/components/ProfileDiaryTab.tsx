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
      <div className="border border-white/[0.06] px-6 py-14 text-center">
        <p className="text-sm font-medium text-zinc-200">
          No diary entries logged yet.
        </p>
        <p className="mt-1.5 text-sm text-zinc-500">
          When you log media, it will appear here by date.
        </p>
      </div>
    );
  }

  // Mark repeat logs as rewatches even if is_rewatch wasn't persisted
  const withFlags = applyRewatchFlags(entries);
  const groups = groupByMonth(withFlags);

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.key} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {group.label}
          </h3>

          <ul className="divide-y divide-white/[0.06] overflow-hidden border border-white/10">
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
  const reviewText = entry.reviewText?.trim() || null;

  return (
    <li>
      <Link
        href={mediaDetailPath(entry.mediaType, entry.mediaId)}
        className={`flex gap-3 px-3 py-3.5 transition hover:bg-zinc-900/80 sm:gap-4 sm:px-4 ${
          reviewText ? "items-start" : "items-center"
        }`}
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
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="truncate text-sm font-medium text-zinc-100 sm:text-[15px]">
                  {entry.title}
                </h4>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                  {MEDIA_TYPE_LABELS[entry.mediaType].replace(/s$/, "")}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">{entry.year}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2 pt-0.5">
              {entry.isRewatch ? (
                <span
                  className="mr-1.5 text-emerald-400"
                  title="Rewatch"
                  aria-label="Rewatch"
                >
                  <RewatchIcon />
                </span>
              ) : null}
              {entry.rating != null ? (
                <DisplayStars rating={entry.rating} size="lg" />
              ) : null}
              {entry.liked ? (
                <span className="text-emerald-400" aria-label="Liked">
                  <HeartIcon />
                </span>
              ) : null}
            </div>
          </div>

          {reviewText ? (
            <p className="mt-2.5 whitespace-pre-wrap break-words border-l-2 border-emerald-500/35 bg-white/[0.03] px-3 py-2 text-[13px] leading-relaxed text-zinc-400">
              {reviewText}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

/** Prefer stored flag; also treat 2nd+ logs of the same title as rewatches. */
function applyRewatchFlags(entries: DiaryEntry[]): DiaryEntry[] {
  const seen = new Set<string>();
  const flags = new Map<string, boolean>();

  // Oldest → newest so the first log of a title is the original
  const chronological = [...entries].sort((a, b) => {
    const byDate = a.loggedOn.localeCompare(b.loggedOn);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });

  for (const entry of chronological) {
    const key = `${entry.mediaType}:${entry.mediaId}`;
    const isRepeat = seen.has(key);
    seen.add(key);
    flags.set(entry.id, entry.isRewatch || isRepeat);
  }

  return entries.map((entry) => ({
    ...entry,
    isRewatch: flags.get(entry.id) ?? entry.isRewatch,
  }));
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
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        d="M12 20s-7-4.4-7-9.2C5 7.5 7.2 5.5 9.6 5.5c1.4 0 2.6.7 3.4 1.8.8-1.1 2-1.8 3.4-1.8 2.4 0 4.6 2 4.6 5.3C21 15.6 12 20 12 20z"
        fill="currentColor"
      />
    </svg>
  );
}

function RewatchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3.5 12a8.5 8.5 0 0 1 14.3-6.2L21 9" />
      <path d="M21 3.5V9h-5.5" />
      <path d="M20.5 12a8.5 8.5 0 0 1-14.3 6.2L3 15" />
      <path d="M3 20.5V15h5.5" />
    </svg>
  );
}
