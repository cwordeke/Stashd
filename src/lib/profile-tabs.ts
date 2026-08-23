import type { MediaType, UnifiedMediaItem } from "@/lib/types";

export const PROFILE_TABS = [
  "top4",
  "stash",
  "diary",
  "watchlist",
  "lists",
] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

export const PROFILE_TAB_LABELS: Record<ProfileTab, string> = {
  top4: "Top 4",
  stash: "Stash",
  diary: "Diary",
  watchlist: "Saved",
  lists: "Lists",
};

export function isProfileTab(value: string | null | undefined): value is ProfileTab {
  return (
    typeof value === "string" &&
    (PROFILE_TABS as readonly string[]).includes(value)
  );
}

export function parseProfileTab(value: string | null | undefined): ProfileTab {
  return isProfileTab(value) ? value : "top4";
}

export interface StashTabItem extends UnifiedMediaItem {
  rating: number | null;
  liked: boolean;
  addedAt: string | null;
}

export interface DiaryEntry {
  id: string;
  mediaId: string;
  mediaType: MediaType;
  title: string;
  creator: string;
  year: string;
  thumbnail: string | null;
  rating: number | null;
  liked: boolean;
  isRewatch: boolean;
  loggedOn: string;
}

export interface WatchlistItem extends UnifiedMediaItem {
  addedAt: string | null;
}

export interface ListSummary {
  id: string;
  name: string;
  description: string;
  tags: string[];
  isRanked: boolean;
  isPublic: boolean;
  itemCount: number;
  previewThumbnails: (string | null)[];
  createdAt: string;
  updatedAt: string;
}

export interface ListItem {
  id: string;
  mediaId: string;
  mediaType: MediaType;
  title: string;
  creator: string;
  year: string;
  thumbnail: string | null;
  notes: string;
  position: number;
  rating: number | null;
}

export interface MediaList {
  id: string;
  userId: string;
  username: string;
  name: string;
  description: string;
  tags: string[];
  isRanked: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  items: ListItem[];
}

export type MediaMetaInput = Pick<
  UnifiedMediaItem,
  "title" | "creator" | "year" | "thumbnail"
>;
