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
  watchlist: "Watchlist",
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
  loggedOn: string;
}

export interface WatchlistItem extends UnifiedMediaItem {
  addedAt: string | null;
}

export type MediaMetaInput = Pick<
  UnifiedMediaItem,
  "title" | "creator" | "year" | "thumbnail"
>;
