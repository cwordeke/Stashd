"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import { processImportBatch } from "@/app/actions/import";
import { cn } from "@/lib/cn";
import {
  chunkItems,
  parseLetterboxdExport,
  toImportBatchPayload,
} from "@/lib/import/letterboxd";
import { IMPORT_BATCH_SIZE } from "@/lib/import/types";
import type { ImportItemResult } from "@/lib/import/types";

type ImportFailure = Extract<ImportItemResult, { ok: false }>;
type ModalPhase = "idle" | "parsing" | "importing" | "complete";

interface LetterboxdImportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LetterboxdImportModal({
  open,
  onClose,
}: LetterboxdImportModalProps) {
  const router = useRouter();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  const [phase, setPhase] = useState<ModalPhase>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [imported, setImported] = useState(0);
  const [failures, setFailures] = useState<ImportFailure[]>([]);
  const [error, setError] = useState<string | null>(null);

  const importing = phase === "parsing" || phase === "importing";

  const reset = useCallback(() => {
    cancelledRef.current = true;
    setPhase("idle");
    setDragOver(false);
    setFileName(null);
    setProgress({ current: 0, total: 0 });
    setImported(0);
    setFailures([]);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    cancelledRef.current = false;

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

    cancelledRef.current = false;
    setError(null);
    setFailures([]);
    setImported(0);
    setFileName(file.name);
    setPhase("parsing");

    let rows;
    try {
      rows = await parseLetterboxdExport(file);
    } catch (err) {
      setPhase("idle");
      setError(
        err instanceof Error ? err.message : "Could not read that export."
      );
      return;
    }

    if (cancelledRef.current) return;

    const batches = chunkItems(
      toImportBatchPayload(rows),
      IMPORT_BATCH_SIZE
    );
    const total = rows.length;
    setProgress({ current: 0, total });
    setPhase("importing");

    let importedCount = 0;
    const nextFailures: ImportFailure[] = [];
    let processed = 0;

    for (const batch of batches) {
      if (cancelledRef.current) return;

      setProgress({ current: Math.min(processed + 1, total), total });

      const result = await processImportBatch(batch);

      if (cancelledRef.current) return;

      if (!result.ok) {
        setPhase("complete");
        setError(result.message);
        setImported(importedCount);
        setFailures(nextFailures);
        router.refresh();
        return;
      }

      for (const item of result.results) {
        if (item.ok) importedCount += 1;
        else nextFailures.push(item);
      }

      processed += batch.length;
      setProgress({ current: processed, total });
      setImported(importedCount);
      setFailures(nextFailures);
    }

    setPhase("complete");
    router.refresh();
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragOver(false);
    void handleFile(event.dataTransfer.files?.[0]);
  }

  const percent =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

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
                src="/letterboxd-logo.svg"
                alt=""
                width={40}
                height={40}
                className="mt-0.5 h-10 w-10 shrink-0"
                unoptimized
              />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Letterboxd
                </p>
                <h2
                  id={titleId}
                  className="mt-1 text-lg font-semibold text-white"
                >
                  Import films
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

          <ol className="space-y-2 text-sm leading-relaxed text-zinc-400">
            <li>
              <span className="font-medium text-zinc-300">1.</span> Export your
              data from Letterboxd (Settings → Import & Export → Export Your
              Data).
            </li>
            <li>
              <span className="font-medium text-zinc-300">2.</span> Upload the
              .zip file here. We’ll use diary.csv, or ratings.csv if diary isn’t
              in the archive.
            </li>
          </ol>

          {phase === "idle" || phase === "parsing" ? (
            <label
              onDragOver={(event) => {
                event.preventDefault();
                if (!importing) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-4 py-10 text-center transition-colors",
                dragOver
                  ? "border-emerald-500/60 bg-emerald-500/10"
                  : "border-white/15 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]",
                importing && "pointer-events-none opacity-60"
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".zip,application/zip,.csv,text/csv"
                className="sr-only"
                disabled={importing}
                onChange={(event) => {
                  void handleFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <UploadGlyph className="h-8 w-8 text-zinc-500" />
              <p className="text-sm text-zinc-200">
                {phase === "parsing"
                  ? "Reading export…"
                  : "Drop a zip here, or click to browse"}
              </p>
              <p className="text-xs text-zinc-500">.zip from Letterboxd</p>
            </label>
          ) : null}

          {phase === "importing" ? (
            <div className="space-y-3">
              {fileName ? (
                <p className="truncate text-xs text-zinc-500">{fileName}</p>
              ) : null}
              <p className="text-sm text-zinc-200">
                Importing {progress.current} of {progress.total} movies...
              </p>
              <div
                className="h-2 overflow-hidden rounded-full bg-zinc-800"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.current}
              >
                <div
                  className="h-full bg-emerald-500 transition-[width] duration-300 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          ) : null}

          {phase === "complete" ? (
            <div className="space-y-3">
              <p className="text-sm text-emerald-400">
                {imported === progress.total && progress.total > 0 && !error
                  ? `Imported ${imported} ${imported === 1 ? "movie" : "movies"}.`
                  : `Imported ${imported} of ${progress.total} movies.`}
              </p>
              {failures.length > 0 ? (
                <div className="max-h-40 overflow-y-auto border border-white/10 bg-white/[0.03] px-3 py-2">
                  <ul className="space-y-1.5 text-sm text-red-400">
                    {failures.map((item, index) => (
                      <li key={`${item.title}-${item.year}-${index}`}>
                        {item.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  reset();
                  cancelledRef.current = false;
                }}
                className="text-[13px] font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              >
                Import another file
              </button>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={importing}
              className="rounded-md border border-white/10 px-4 py-2.5 text-[13px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] disabled:opacity-60"
            >
              {phase === "complete" ? "Done" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 16V4m0 0 4 4M12 4 8 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 14.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
