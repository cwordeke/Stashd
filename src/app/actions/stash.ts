"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  MEDIA_TYPES,
  type MediaType,
  type StashShelves,
  type UnifiedMediaItem,
} from "@/lib/types";
import { STASH_TOP_N, shelvesFromItems } from "@/lib/stash-utils";

export interface StashItem extends UnifiedMediaItem {
  stashId: string;
  position: number;
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
  position?: number | null;
}

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
    position: row.position ?? 0,
  };
}

export async function getStashByUserId(userId: string): Promise<StashItem[]> {
  const supabase = await createClient();

  const ordered = await supabase
    .from("stash_items")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  let data = ordered.data;
  let error = ordered.error;

  if (error) {
    const fallback = await supabase
      .from("stash_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("getStashByUserId:", error.message);
    return [];
  }

  return ((data as StashRow[] | null) ?? [])
    .map(rowToStashItem)
    .filter((item): item is StashItem => item !== null);
}

export async function getUserStash(): Promise<StashItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];
  return getStashByUserId(user.id);
}

export async function getUserStashShelves(): Promise<StashShelves> {
  const items = await getUserStash();
  return shelvesFromItems(items);
}

export async function getStashShelvesByUserId(
  userId: string
): Promise<StashShelves> {
  const items = await getStashByUserId(userId);
  return shelvesFromItems(items);
}

function asMediaItem(row: {
  media_id: string;
  media_type: string;
  title?: string | null;
  creator?: string | null;
  image_url?: string | null;
  release_year?: string | null;
}): UnifiedMediaItem | null {
  if (!isMediaType(row.media_type) || !row.media_id) return null;
  return {
    id: row.media_id,
    mediaType: row.media_type,
    title: row.title?.trim() || "Untitled",
    creator: row.creator?.trim() || "—",
    year: row.release_year?.trim() || "—",
    thumbnail: row.image_url || null,
  };
}

/** Logged/rated titles in one category — no provider lookups, fast for the Top 4 picker. */
export async function getLoggedMediaForType(
  mediaType: MediaType
): Promise<UnifiedMediaItem[]> {
  if (!isMediaType(mediaType)) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const [diaryRes, ratingsRes] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("media_id, media_type, title, image_url, release_year, watched_on")
      .eq("user_id", user.id)
      .eq("media_type", mediaType)
      .order("watched_on", { ascending: false })
      .limit(100),
    supabase
      .from("user_ratings")
      .select(
        "media_id, media_type, title, creator, image_url, release_year, updated_at"
      )
      .eq("user_id", user.id)
      .eq("media_type", mediaType)
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);

  const seen = new Map<string, UnifiedMediaItem>();

  for (const row of diaryRes.data ?? []) {
    const item = asMediaItem(row);
    if (!item || seen.has(item.id)) continue;
    seen.set(item.id, item);
  }

  for (const row of ratingsRes.data ?? []) {
    const item = asMediaItem(row);
    if (!item || seen.has(item.id)) continue;
    seen.set(item.id, item);
  }

  if (diaryRes.error) {
    console.error("[getLoggedMediaForType] diary", diaryRes.error.message);
  }
  if (ratingsRes.error) {
    console.error("[getLoggedMediaForType] ratings", ratingsRes.error.message);
  }

  return Array.from(seen.values()).slice(0, 80);
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

  if (!isMediaType(item.mediaType) || !item.id) {
    return { ok: false, message: "Invalid media item" };
  }

  const { count, error: countError } = await supabase
    .from("stash_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("media_type", item.mediaType);

  if (countError) {
    return { ok: false, message: countError.message };
  }

  if ((count ?? 0) >= STASH_TOP_N) {
    return { ok: false, message: "Top 4 for this category is full" };
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

  const nextPosition = count ?? 0;
  const payload = {
    user_id: user.id,
    media_id: item.id,
    media_type: item.mediaType,
    title: item.title.trim().slice(0, 300) || "Untitled",
    creator: item.creator?.trim().slice(0, 300) || null,
    image_url: item.thumbnail,
    release_year: item.year || null,
    position: nextPosition,
  };

  let { data, error } = await supabase
    .from("stash_items")
    .insert(payload)
    .select("*")
    .single();

  if (error && /position/i.test(error.message)) {
    const withoutPosition = {
      user_id: payload.user_id,
      media_id: payload.media_id,
      media_type: payload.media_type,
      title: payload.title,
      creator: payload.creator,
      image_url: payload.image_url,
      release_year: payload.release_year,
    };
    const fallback = await supabase
      .from("stash_items")
      .insert(withoutPosition)
      .select("*")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return { ok: false, message: error.message };
  }

  const stashItem = rowToStashItem(data as StashRow);
  if (stashItem && stashItem.position === 0 && nextPosition > 0) {
    stashItem.position = nextPosition;
  }
  await revalidateStashPaths(user.id);

  return {
    ok: true,
    item: stashItem ?? undefined,
    message: "Added to your stash",
  };
}

async function revalidateStashPaths(userId: string) {
  revalidatePath("/profile");
  revalidatePath("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (data?.username) {
    revalidatePath(`/u/${data.username}`);
  }
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

  const { data: removed, error } = await supabase
    .from("stash_items")
    .delete()
    .eq("id", stashId)
    .eq("user_id", user.id)
    .select("media_type")
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }

  if (removed?.media_type && isMediaType(removed.media_type)) {
    await persistShelfOrder(supabase, user.id, removed.media_type);
  }

  await revalidateStashPaths(user.id);

  return { ok: true, message: "Removed from your stash" };
}

export async function reorderStashItems(
  mediaType: MediaType,
  orderedStashIds: string[]
): Promise<StashActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in required" };
  }

  if (!isMediaType(mediaType) || orderedStashIds.length === 0) {
    return { ok: false, message: "Invalid reorder" };
  }

  if (orderedStashIds.length > STASH_TOP_N) {
    return { ok: false, message: "Top 4 only has four slots" };
  }

  const { data: rows, error: fetchError } = await supabase
    .from("stash_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("media_type", mediaType);

  if (fetchError) {
    return { ok: false, message: fetchError.message };
  }

  const owned = new Set((rows ?? []).map((row) => row.id as string));
  if (
    orderedStashIds.length !== owned.size ||
    orderedStashIds.some((id) => !owned.has(id))
  ) {
    return { ok: false, message: "Stash changed, refresh and try again" };
  }

  const persistError = await persistShelfOrder(
    supabase,
    user.id,
    mediaType,
    orderedStashIds
  );
  if (persistError) {
    return { ok: false, message: persistError };
  }

  await revalidateStashPaths(user.id);
  return { ok: true, message: "Order updated" };
}

async function persistShelfOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  mediaType: MediaType,
  orderedStashIds?: string[]
): Promise<string | null> {
  let ids = orderedStashIds;

  if (!ids) {
    const ordered = await supabase
      .from("stash_items")
      .select("id")
      .eq("user_id", userId)
      .eq("media_type", mediaType)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    let rows = ordered.data;
    if (ordered.error) {
      const fallback = await supabase
        .from("stash_items")
        .select("id")
        .eq("user_id", userId)
        .eq("media_type", mediaType)
        .order("created_at", { ascending: true });
      rows = fallback.data;
    }

    ids = (rows ?? []).map((row) => row.id as string);
  }

  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from("stash_items")
      .update({ position: i })
      .eq("id", ids[i])
      .eq("user_id", userId);

    if (error) {
      return persistOrderViaCreatedAt(supabase, userId, ids);
    }
  }

  return null;
}

async function persistOrderViaCreatedAt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orderedStashIds: string[]
): Promise<string | null> {
  const base = Date.now();

  for (let i = 0; i < orderedStashIds.length; i++) {
    const { error } = await supabase
      .from("stash_items")
      .update({ created_at: new Date(base + i).toISOString() })
      .eq("id", orderedStashIds[i])
      .eq("user_id", userId);

    if (error) return error.message;
  }

  return null;
}
