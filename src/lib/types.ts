export type MediaType = "movie" | "tv" | "game" | "book" | "music";

export interface MediaItem {
  id: string;
  title: string;
  creator: string;
  year: string;
  thumbnail: string | null;
  mediaType: MediaType;
}

export interface SearchResponse {
  results: MediaItem[];
  error?: string;
}

export interface ColumnState {
  loading: boolean;
  results: MediaItem[];
  error: string | null;
}
