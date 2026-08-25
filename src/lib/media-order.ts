import { MEDIA_TYPES, isMediaType, type MediaType } from "@/lib/types";

export function parsePreferredCategories(value: unknown): MediaType[] {
  let items: unknown[] = [];

  if (Array.isArray(value)) {
    items = value;
  } else if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim().replace(/^\{|\}$/g, "");
    items = trimmed
      ? trimmed.split(",").map((part) => part.trim().replace(/^"+|"+$/g, ""))
      : [];
  }

  const seen = new Set<MediaType>();
  const next: MediaType[] = [];
  for (const item of items) {
    if (typeof item !== "string" || !isMediaType(item) || seen.has(item)) {
      continue;
    }
    seen.add(item);
    next.push(item);
  }
  return next;
}

/** Ranked types first, then any remaining types in the default order. */
export function orderedMediaTypes(
  preferred: MediaType[] | null | undefined
): MediaType[] {
  const ranked = parsePreferredCategories(preferred);
  const seen = new Set(ranked);
  return [...ranked, ...MEDIA_TYPES.filter((type) => !seen.has(type))];
}

const CATEGORY_NAV: Record<MediaType, { href: string; label: string }> = {
  movie: { href: "/movies", label: "Movies" },
  tv: { href: "/tv", label: "TV" },
  game: { href: "/games", label: "Games" },
  book: { href: "/books", label: "Books" },
  music: { href: "/music", label: "Music" },
};

export function navLinksForPreferences(
  preferred: MediaType[] | null | undefined
): { href: string; label: string }[] {
  return [
    { href: "/", label: "Home" },
    ...orderedMediaTypes(preferred).map((type) => CATEGORY_NAV[type]),
  ];
}
