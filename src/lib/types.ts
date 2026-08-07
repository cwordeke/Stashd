export type MediaType = "movie" | "tv" | "game" | "book" | "music";

/** Normalized media item across all five APIs */
export interface UnifiedMediaItem {
  id: string;
  title: string;
  creator: string;
  year: string;
  /** Prefer poster-sized art for uniform 2:3 cards */
  thumbnail: string | null;
  mediaType: MediaType;
}

/** Full detail payload for the Letterboxd-style media page */
export interface MediaDetails extends UnifiedMediaItem {
  description: string | null;
  /** Landscape banner; null → UI falls back to blurred poster */
  backdropUrl: string | null;
  tagline?: string | null;
}

/** @deprecated Prefer UnifiedMediaItem — kept for API route compatibility */
export type MediaItem = UnifiedMediaItem;

export interface SearchResponse {
  results: UnifiedMediaItem[];
  error?: string;
}

export interface ColumnState {
  loading: boolean;
  results: UnifiedMediaItem[];
  error: string | null;
}

export type StashSlot = (UnifiedMediaItem & { stashId?: string }) | null;

export type StashShelves = Record<MediaType, StashSlot[]>;

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: "Movies",
  tv: "TV Shows",
  game: "Video Games",
  book: "Books",
  music: "Music Albums",
};

export const MEDIA_TYPES: MediaType[] = [
  "movie",
  "tv",
  "game",
  "book",
  "music",
];

export function emptyShelves(): StashShelves {
  return {
    movie: [null, null, null, null],
    tv: [null, null, null, null],
    game: [null, null, null, null],
    book: [null, null, null, null],
    music: [null, null, null, null],
  };
}

export function mediaKey(item: UnifiedMediaItem): string {
  return `${item.mediaType}:${item.id}`;
}

export function mediaDetailPath(mediaType: MediaType, id: string): string {
  return `/media/${mediaType}/${encodeURIComponent(id)}`;
}

export function isMediaType(value: string): value is MediaType {
  return (MEDIA_TYPES as string[]).includes(value);
}
