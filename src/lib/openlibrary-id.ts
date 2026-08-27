/**
 * Normalize Open Library work/edition keys for URLs and API calls.
 * Stored ids use `works/OL123W` (no leading slash) so paths stay URL-safe.
 */

const WORK_KEY_RE = /^(?:\/)?works\/(OL\d+W)$/i;
const EDITION_KEY_RE = /^(?:\/)?books\/(OL\d+M)$/i;
const WORK_ID_RE = /^(OL\d+W)$/i;
const EDITION_ID_RE = /^(OL\d+M)$/i;

export function openLibraryWorkId(key: string | undefined | null): string {
  if (!key) return "";
  const trimmed = decodeURIComponent(key).trim();
  if (!trimmed || trimmed.startsWith("ph-")) return trimmed;

  const workMatch = trimmed.match(WORK_KEY_RE);
  if (workMatch) return `works/${workMatch[1]}`;

  const editionMatch = trimmed.match(EDITION_KEY_RE);
  if (editionMatch) return `books/${editionMatch[1]}`;

  if (WORK_ID_RE.test(trimmed)) return `works/${trimmed}`;
  if (EDITION_ID_RE.test(trimmed)) return `books/${trimmed}`;

  return trimmed.replace(/^\/+/, "");
}

/** Absolute Open Library JSON path, e.g. `/works/OL123W`. */
export function openLibraryApiPath(id: string): string {
  const normalized = openLibraryWorkId(id);
  if (!normalized) throw new Error("Invalid book id");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function isResolvableOpenLibraryId(id: string): boolean {
  const normalized = openLibraryWorkId(id);
  if (!normalized || normalized.startsWith("ph-")) return false;
  return WORK_KEY_RE.test(normalized) || EDITION_KEY_RE.test(normalized);
}
