"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  MEDIA_TYPES,
  type MediaType,
  type StashShelves,
  type UnifiedMediaItem,
} from "@/lib/types";
import { shelvesFromItems } from "@/lib/stash-utils";

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

export async function getStashByUserId(userId: string): Promise<StashItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stash_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

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

  const { error } = await supabase
    .from("stash_items")
    .delete()
    .eq("id", stashId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  await revalidateStashPaths(user.id);

  return { ok: true, message: "Removed from your stash" };
}
