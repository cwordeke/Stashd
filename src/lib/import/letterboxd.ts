import JSZip from "jszip";
import Papa from "papaparse";
import type { ImportBatchItem } from "@/lib/import/types";

const TITLE_KEYS = ["name", "title"];
const YEAR_KEYS = ["year"];
const RATING_KEYS = ["rating"];
const WATCHED_DATE_KEYS = ["watched date", "watched_date"];
const REWATCH_KEYS = ["rewatch"];

const ZIP_CSV_PREFERENCE = ["diary.csv", "ratings.csv"] as const;

function normalizeKey(key: string): string {
  return key.replace(/^\uFEFF/, "").trim().toLowerCase();
}

function cell(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function parseRating(raw: string): number | undefined {
  if (!raw) return undefined;
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return undefined;
  const stepped = Math.round(value * 2) / 2;
  if (stepped < 0.5 || stepped > 5) return undefined;
  return stepped;
}

function parseRewatch(raw: string): boolean | undefined {
  if (!raw) return undefined;
  const value = raw.trim().toLowerCase();
  if (value === "yes" || value === "true" || value === "1") return true;
  if (value === "no" || value === "false" || value === "0") return false;
  return undefined;
}

function normalizeRow(raw: Record<string, unknown>): ImportBatchItem | null {
  const row: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    row[normalizeKey(key)] = String(value);
  }

  const title = cell(row, TITLE_KEYS);
  if (!title) return null;

  const yearRaw = cell(row, YEAR_KEYS);
  const yearMatch = yearRaw.match(/(\d{4})/);
  const year = yearMatch?.[1] ?? "";
  const rating = parseRating(cell(row, RATING_KEYS));
  const watchedDate = cell(row, WATCHED_DATE_KEYS) || undefined;
  const rewatch = parseRewatch(cell(row, REWATCH_KEYS));

  const item: ImportBatchItem = { title, year };
  if (rating != null) item.rating = rating;
  if (watchedDate) item.watchedDate = watchedDate;
  if (rewatch != null) item.rewatch = rewatch;
  return item;
}

function laterDate(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

/** Collapse duplicate title+year rows, keeping a rating and latest watched date. */
export function dedupeImportRows(rows: ImportBatchItem[]): ImportBatchItem[] {
  const map = new Map<string, ImportBatchItem>();

  for (const row of rows) {
    const key = `${row.title.toLowerCase()}::${row.year}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, row);
      continue;
    }

    map.set(key, {
      title: prev.title,
      year: prev.year,
      rating: row.rating ?? prev.rating,
      watchedDate: laterDate(prev.watchedDate, row.watchedDate),
      rewatch: row.rewatch || prev.rewatch,
    });
  }

  return [...map.values()];
}

export function rowsFromLetterboxdData(
  data: Record<string, unknown>[]
): ImportBatchItem[] {
  const rows: ImportBatchItem[] = [];
  for (const raw of data) {
    const row = normalizeRow(raw);
    if (row) rows.push(row);
  }

  const unique = dedupeImportRows(rows);
  if (unique.length === 0) {
    throw new Error(
      "This export doesn’t look like Letterboxd diary or ratings data. Expected columns: Name, Year, and optional Rating."
    );
  }

  return unique;
}

/** Parse a Letterboxd CSV string (diary.csv or ratings.csv) into import rows. */
export function parseLetterboxdCsvText(csvText: string): ImportBatchItem[] {
  const results = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.replace(/^\uFEFF/, "").trim(),
  });

  if (results.errors.length > 0 && !results.data.length) {
    const first = results.errors[0];
    throw new Error(first.message || "Could not parse that CSV.");
  }

  return rowsFromLetterboxdData(results.data);
}

export function parseLetterboxdCsv(file: File): Promise<ImportBatchItem[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.replace(/^\uFEFF/, "").trim(),
      complete: (results) => {
        try {
          resolve(rowsFromLetterboxdData(results.data));
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

function entryBasename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

async function extractPreferredCsvFromZip(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const paths = Object.keys(zip.files);

  for (const preferred of ZIP_CSV_PREFERENCE) {
    const match = paths.find((path) => {
      const entry = zip.files[path];
      if (!entry || entry.dir) return false;
      return entryBasename(path) === preferred;
    });

    if (!match) continue;

    const text = await zip.files[match].async("string");
    if (text.trim()) return text;
  }

  throw new Error(
    "Couldn’t find diary.csv or ratings.csv in that zip. Export your data from Letterboxd and upload the zip it gives you."
  );
}

function isZipFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".zip") ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed"
  );
}

function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".csv") ||
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel"
  );
}

/** Load a Letterboxd zip (diary.csv, else ratings.csv) or a standalone CSV. */
export async function parseLetterboxdExport(
  file: File
): Promise<ImportBatchItem[]> {
  if (isZipFile(file)) {
    const csvText = await extractPreferredCsvFromZip(file);
    return parseLetterboxdCsvText(csvText);
  }

  if (isCsvFile(file)) {
    return parseLetterboxdCsv(file);
  }

  throw new Error("Please upload a Letterboxd .zip export.");
}

export function toImportBatchPayload(
  items: ImportBatchItem[]
): ImportBatchItem[] {
  return items.map((item) => {
    const payload: ImportBatchItem = {
      title: item.title,
      year: item.year,
    };
    if (item.rating != null) payload.rating = item.rating;
    return payload;
  });
}

export function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
