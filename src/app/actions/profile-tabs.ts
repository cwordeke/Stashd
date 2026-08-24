"use server";

import { getListsByUserId } from "@/app/actions/lists";
import {
  getDiaryEntriesByUserId,
  getRecentDiaryEntriesByUserId,
  getStashTabItems,
  getWatchlistByUserId,
} from "@/app/actions/profile-media";
import { getStashShelvesByUserId } from "@/app/actions/stash";
import type {
  DiaryEntry,
  ListSummary,
  ProfileTab,
  StashTabItem,
  WatchlistItem,
} from "@/lib/profile-tabs";
import { emptyShelves, type StashShelves } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

export type ProfileTabPayload = {
  shelves?: StashShelves;
  recentDiary?: DiaryEntry[];
  stashItems?: StashTabItem[];
  diaryEntries?: DiaryEntry[];
  watchlistItems?: WatchlistItem[];
  lists?: ListSummary[];
};

/** Fetch only the data needed for one profile tab (lazy-load friendly). */
export async function fetchProfileTabData(
  profileUserId: string,
  tab: ProfileTab
): Promise<ProfileTabPayload> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  switch (tab) {
    case "top4": {
      const [shelves, recentDiary] = await Promise.all([
        getStashShelvesByUserId(profileUserId),
        getRecentDiaryEntriesByUserId(profileUserId, 8),
      ]);
      return { shelves, recentDiary };
    }
    case "stash":
      return { stashItems: await getStashTabItems(profileUserId) };
    case "diary":
      return { diaryEntries: await getDiaryEntriesByUserId(profileUserId) };
    case "watchlist":
      return { watchlistItems: await getWatchlistByUserId(profileUserId) };
    case "lists":
      return { lists: await getListsByUserId(profileUserId, viewerId) };
    default:
      return { shelves: emptyShelves() };
  }
}
