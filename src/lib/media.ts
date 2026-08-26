/** Shared poster URL helpers — favor mid-size art for crisp 2:3 cards */

export function tmdbPoster(path?: string | null, size = "w342"): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function tmdbBackdrop(
  path?: string | null,
  size: "w780" | "w1280" | "original" = "w1280"
): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function igdbCover(url?: string): string | null {
  if (!url) return null;
  const absolute = url.startsWith("//") ? `https:${url}` : url;
  return absolute
    .replace("t_thumb", "t_cover_big")
    .replace("t_cover_small", "t_cover_big");
}

export function igdbScreenshot(url?: string): string | null {
  if (!url) return null;
  const absolute = url.startsWith("//") ? `https:${url}` : url;
  return absolute
    .replace("t_thumb", "t_1080p")
    .replace("t_cover_small", "t_1080p")
    .replace("t_screenshot_med", "t_1080p");
}

export function openLibraryCover(
  coverId?: number,
  size: "S" | "M" | "L" = "M"
) {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

export function spotifyArt(
  images?: Array<{ url?: string; width?: number }> | null
): string | null {
  if (!images?.length) return null;
  const sorted = [...images].sort(
    (a, b) => (b.width ?? 0) - (a.width ?? 0)
  );
  return sorted[Math.min(1, sorted.length - 1)]?.url ?? sorted[0]?.url ?? null;
}

export function spotifyArtLarge(
  images?: Array<{ url?: string; width?: number }> | null
): string | null {
  if (!images?.length) return null;
  const sorted = [...images].sort(
    (a, b) => (b.width ?? 0) - (a.width ?? 0)
  );
  return sorted[0]?.url ?? null;
}

export function yearFromDate(date?: string): string {
  if (!date || date.length < 4) return "—";
  return date.slice(0, 4);
}

export function yearFromUnix(seconds?: number): string {
  if (!seconds) return "—";
  return String(new Date(seconds * 1000).getUTCFullYear());
}
