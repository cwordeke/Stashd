"use client";

import Image from "next/image";
import {
  useRef,
  useState,
  type DragEvent,
} from "react";
import { motion } from "framer-motion";
import { processImportBatch } from "@/app/actions/import";
import { cn } from "@/lib/cn";
import {
  chunkItems,
  parseLetterboxdExport,
  toImportBatchPayload,
} from "@/lib/import/letterboxd";
import { IMPORT_BATCH_SIZE } from "@/lib/import/types";

const PLATFORMS = [
  {
    id: "letterboxd",
    name: "Letterboxd",
    blurb: "Drop your export zip to bring in films and ratings.",
    icon: "/letterboxd-logo.svg",
    active: true,
  },
  {
    id: "spotify",
    name: "Spotify",
    blurb: "Albums you’ve saved and played on repeat.",
    icon: "/spotifyIcon.png",
    active: false,
  },
  {
    id: "steam",
    name: "Steam",
    blurb: "Games from your library, hours and all.",
    icon: "/steamIcon.png",
    active: false,
  },
  {
    id: "goodreads",
    name: "Goodreads",
    blurb: "Books, shelves, and star ratings.",
    icon: "/goodreadsIcon.png",
    active: false,
  },
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];

interface StepImportProps {
  onContinue: () => void;
  onImported: () => void;
}

export default function StepImport({
  onContinue,
  onImported,
}: StepImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [percent, setPercent] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comingSoon, setComingSoon] = useState<PlatformId | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file || importing) return;

    const name = file.name.toLowerCase();
    const isZip =
      name.endsWith(".zip") ||
      file.type === "application/zip" ||
      file.type === "application/x-zip-compressed";
    const isCsv =
      name.endsWith(".csv") ||
      file.type === "text/csv" ||
      file.type === "application/vnd.ms-excel";

    if (!isZip && !isCsv) {
      setError("Please upload a Letterboxd .zip export.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("That file is too large. Exports should be under 25 MB.");
      return;
    }

    setError(null);
    setImporting(true);
    setPercent(8);
    setStatus("Parsing export…");

    let rows;
    try {
      rows = await parseLetterboxdExport(file);
    } catch (err) {
      setImporting(false);
      setPercent(0);
      setStatus(null);
      setError(
        err instanceof Error ? err.message : "Could not read that export."
      );
      return;
    }

    const batches = chunkItems(toImportBatchPayload(rows), IMPORT_BATCH_SIZE);
    const total = Math.max(rows.length, 1);
    let processed = 0;
    let importedCount = 0;
    setStatus(`Importing ${rows.length} titles…`);

    for (const batch of batches) {
      const result = await processImportBatch(batch);
      if (!result.ok) {
        setImporting(false);
        setError(result.message);
        return;
      }
      importedCount += result.results.filter((item) => item.ok).length;
      processed += batch.length;
      setPercent(Math.min(99, Math.round((processed / total) * 100)));
    }

    setPercent(100);
    setStatus(
      importedCount > 0
        ? `Imported ${importedCount} film${importedCount === 1 ? "" : "s"}`
        : "No matching films found"
    );
    window.setTimeout(() => {
      setImporting(false);
      onImported();
    }, 700);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    void handleFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Import your archive
        </h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          Bring in a library you already keep, or skip and start fresh.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PLATFORMS.map((platform) => (
          <motion.div
            key={platform.id}
            whileTap={platform.active ? { scale: 0.98 } : undefined}
            className={cn(
              "border p-4",
              platform.id === "letterboxd"
                ? "border-white/10 bg-zinc-950/60 sm:col-span-2"
                : "border-white/10 bg-zinc-950/40"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Image
                  src={platform.icon}
                  alt=""
                  width={32}
                  height={32}
                  unoptimized={platform.icon.endsWith(".svg")}
                  className={cn(
                    "h-8 w-8 shrink-0 rounded-full",
                    platform.id === "spotify" ? "object-cover" : "object-contain"
                  )}
                />
                <div>
                  <p className="text-[14px] font-medium text-white">
                    {platform.name}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                    {platform.blurb}
                  </p>
                </div>
              </div>
              {platform.active ? null : (
                <span className="shrink-0 border border-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                  Coming Soon
                </span>
              )}
            </div>

            {platform.id === "letterboxd" ? (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!importing) setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  "mt-4 flex flex-col items-center justify-center gap-3 border border-dashed px-4 py-8 text-center transition-colors",
                  dragOver
                    ? "border-emerald-500/60 bg-emerald-500/10"
                    : "border-white/10 bg-white/[0.02]"
                )}
              >
                {importing ? (
                  <ProgressRing percent={percent} />
                ) : (
                  <p className="text-sm text-zinc-400">
                    Drag & drop your Letterboxd export
                  </p>
                )}
                <p className="text-xs text-zinc-500">
                  {status ?? ".zip or diary.csv from Settings → Export"}
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".zip,.csv,application/zip,text/csv"
                  className="sr-only"
                  disabled={importing}
                  onChange={(event) => {
                    void handleFile(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => inputRef.current?.click()}
                  className="border border-white/10 px-3 py-1.5 text-[12px] font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/[0.04] disabled:opacity-50"
                >
                  {importing ? "Importing…" : "Choose file"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setComingSoon(platform.id);
                  window.setTimeout(() => setComingSoon(null), 1600);
                }}
                className="mt-4 w-full border border-white/10 px-3 py-2 text-[12px] font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
              >
                {comingSoon === platform.id ? "Coming soon" : "Connect"}
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onContinue}
        disabled={importing}
        className="w-full bg-emerald-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {importing ? "Importing…" : "Continue"}
      </button>
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="3"
      />
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        stroke="#34d399"
        strokeWidth="3"
        strokeLinecap="square"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 24 24)"
        className="transition-[stroke-dashoffset] duration-300 ease-out"
      />
    </svg>
  );
}
