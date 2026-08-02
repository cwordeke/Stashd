"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  MEDIA_TYPES,
  emptyShelves,
  type MediaType,
  type StashShelves,
  type UnifiedMediaItem,
} from "@/lib/types";

export interface StashItem extends UnifiedMediaItem {
  stashId: string;
}

export type StashActionResult =
  | { ok: true; item?: StashItem; message: string }
  | { ok: false; message: string };

interface StashRow {
  id: string;
  user_id: string;
  media_id: string;
  media_type: string;
  title: string;
  creator: string | null;
  image_url: string | null;
  release_year: string | null;
  created_at: string;
}

const TOP_N = 4;

function isMediaType(value: string): value is MediaType {
  return (MEDIA_TYPES as string[]).includes(value);
}

function rowToStashItem(row: StashRow): StashItem | null {
  if (!isMediaType(row.media_type)) return null;

  return {
    stashId: row.id,
    id: row.media_id,
    title: row.title,
    creator: row.creator ?? "—",
    year: row.release_year ?? "—",
    thumbnail: row.image_url,
    mediaType: row.media_type,
  };
}

export async function getUserStash(): Promise<StashItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("stash_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getUserStash:", error.message);
    return [];
  }

  return ((data as StashRow[] | null) ?? [])
    .map(rowToStashItem)
    .filter((item): item is StashItem => item !== null);
}

export async function getUserStashShelves(): Promise<StashShelves> {
  const items = await getUserStash();
  const shelves = emptyShelves();

  for (const item of items) {
    const shelf = shelves[item.mediaType];
    if (shelf.filter(Boolean).length >= TOP_N) continue;
    const emptyIndex = shelf.findIndex((slot) => slot === null);
    if (emptyIndex !== -1) {
      shelf[emptyIndex] = item;
    }
  }

  return shelves;
}

export async function addStashItem(
  item: UnifiedMediaItem
): Promise<StashActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in to add items to your stash" };
  }

  if (!isMediaType(item.mediaType)) {
    return { ok: false, message: "Invalid media type" };
  }

  const { count, error: countError } = await supabase
    .from("stash_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("media_type", item.mediaType);

  if (countError) {
    return { ok: false, message: countError.message };
  }

  if ((count ?? 0) >= TOP_N) {
    return {
      ok: false,
      message: "Top 4 for this category is full",
    };
  }

  const { data: existing } = await supabase
    .from("stash_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("media_type", item.mediaType)
    .eq("media_id", item.id)
    .maybeSingle();

  if (existing) {
    return { ok: false, message: "Already in your Top 4" };
  }

  const { data, error } = await supabase
    .from("stash_items")
    .insert({
      user_id: user.id,
      media_id: item.id,
      media_type: item.mediaType,
      title: item.title,
      creator: item.creator,
      image_url: item.thumbnail,
      release_year: item.year,
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  const stashItem = rowToStashItem(data as StashRow);
  revalidatePath("/profile");
  revalidatePath("/");

  return {
    ok: true,
    item: stashItem ?? undefined,
    message: "Added to your stash",
  };
}

export async function removeStashItem(
  stashId: string
): Promise<StashActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in required" };
  }

  const { error } = await supabase
    .from("stash_items")
    .delete()
    .eq("id", stashId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/");

  return { ok: true, message: "Removed from your stash" };
}
