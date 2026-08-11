"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { ListItem, ListSummary, MediaList } from "@/lib/profile-tabs";
import { isMediaType, type MediaType, type UnifiedMediaItem } from "@/lib/types";

export type ListActionResult =
  | { ok: true; message: string; listId?: string; itemId?: string }
  | { ok: false; message: string };

interface ListRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  is_ranked: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface ListItemRow {
  id: string;
  list_id: string;
  user_id: string;
  media_id: string;
  media_type: string;
  title: string;
  creator: string | null;
  image_url: string | null;
  release_year: string | null;
  notes: string | null;
  position: number;
  created_at: string;
}

const PREVIEW_COUNT = 5;

function normalizeTags(tags: string[] | null | undefined): string[] {
  if (!tags?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase().slice(0, 40);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= 20) break;
  }
  return out;
}

function rowToItem(
  row: ListItemRow,
  rating: number | null = null
): ListItem | null {
  if (!isMediaType(row.media_type)) return null;
  return {
    id: row.id,
    mediaId: row.media_id,
    mediaType: row.media_type,
    title: row.title,
    creator: row.creator ?? "—",
    year: row.release_year ?? "—",
    thumbnail: row.image_url,
    notes: row.notes ?? "",
    position: row.position,
    rating,
  };
}

async function getUsername(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  return data?.username ?? null;
}

async function touchListUpdatedAt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listId: string
) {
  await supabase
    .from("lists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", listId);
}

async function revalidateListPaths(userId: string, listId?: string) {
  revalidatePath("/profile");
  const supabase = await createClient();
  const username = await getUsername(supabase, userId);
  if (username) {
    revalidatePath(`/u/${username}`);
    if (listId) {
      revalidatePath(`/u/${username}/lists/${listId}`);
      revalidatePath(`/u/${username}/lists/${listId}/edit`);
    }
  }
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null };
  return { supabase, user };
}

export async function getListsByUserId(
  userId: string,
  viewerId: string | null = null
): Promise<ListSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from("lists")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  // Guests / non-owners only see public lists (RLS also enforces this).
  if (viewerId !== userId) {
    query = query.eq("is_public", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[getListsByUserId]", error.message);
    return [];
  }

  const rows = (data as ListRow[] | null) ?? [];
  if (!rows.length) return [];

  const listIds = rows.map((r) => r.id);
  const { data: itemData, error: itemError } = await supabase
    .from("list_items")
    .select("list_id, image_url, position")
    .in("list_id", listIds)
    .order("position", { ascending: true });

  if (itemError) {
    console.error("[getListsByUserId] items", itemError.message);
  }

  const byList = new Map<string, { count: number; thumbs: (string | null)[] }>();
  for (const id of listIds) {
    byList.set(id, { count: 0, thumbs: [] });
  }

  for (const item of (itemData as
    | { list_id: string; image_url: string | null; position: number }[]
    | null) ?? []) {
    const bucket = byList.get(item.list_id);
    if (!bucket) continue;
    bucket.count += 1;
    if (bucket.thumbs.length < PREVIEW_COUNT) {
      bucket.thumbs.push(item.image_url);
    }
  }

  return rows.map((row) => {
    const bucket = byList.get(row.id) ?? { count: 0, thumbs: [] };
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      tags: normalizeTags(row.tags),
      isRanked: Boolean(row.is_ranked),
      isPublic: Boolean(row.is_public),
      itemCount: bucket.count,
      previewThumbnails: bucket.thumbs,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function getListById(
  listId: string,
  viewerId: string | null = null
): Promise<MediaList | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lists")
    .select("*")
    .eq("id", listId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[getListById]", error.message);
    return null;
  }

  const row = data as ListRow;
  if (!row.is_public && row.user_id !== viewerId) {
    return null;
  }

  const username = (await getUsername(supabase, row.user_id)) ?? "unknown";

  const { data: itemData, error: itemError } = await supabase
    .from("list_items")
    .select("*")
    .eq("list_id", listId)
    .order("position", { ascending: true });

  if (itemError) {
    console.error("[getListById] items", itemError.message);
  }

  const itemRows = (itemData as ListItemRow[] | null) ?? [];

  // Attach the list owner's ratings when available.
  const ratingMap = new Map<string, number>();
  if (itemRows.length) {
    const { data: ratings } = await supabase
      .from("user_ratings")
      .select("media_id, media_type, rating")
      .eq("user_id", row.user_id);

    for (const r of (ratings as
      | { media_id: string; media_type: string; rating: number }[]
      | null) ?? []) {
      ratingMap.set(`${r.media_type}:${r.media_id}`, Number(r.rating));
    }
  }

  const items = itemRows
    .map((item) =>
      rowToItem(
        item,
        ratingMap.get(`${item.media_type}:${item.media_id}`) ?? null
      )
    )
    .filter((item): item is ListItem => item !== null);

  return {
    id: row.id,
    userId: row.user_id,
    username,
    name: row.name,
    description: row.description ?? "",
    tags: normalizeTags(row.tags),
    isRanked: Boolean(row.is_ranked),
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

export interface CreateListInput {
  name: string;
  description?: string;
  tags?: string[];
  isRanked?: boolean;
  isPublic?: boolean;
}

export async function createList(
  input: CreateListInput
): Promise<ListActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, message: "Sign in required" };

  const name = input.name.trim().slice(0, 120);
  if (!name) return { ok: false, message: "Name is required" };

  const payload = {
    user_id: user.id,
    name,
    description: (input.description ?? "").trim().slice(0, 4000),
    tags: normalizeTags(input.tags),
    is_ranked: Boolean(input.isRanked),
    is_public: input.isPublic !== false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("lists")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Could not create list" };
  }

  await revalidateListPaths(user.id, data.id);
  return { ok: true, message: "List created", listId: data.id };
}

export interface UpdateListInput {
  listId: string;
  name: string;
  description?: string;
  tags?: string[];
  isRanked?: boolean;
  isPublic?: boolean;
}

export async function updateList(
  input: UpdateListInput
): Promise<ListActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, message: "Sign in required" };

  const name = input.name.trim().slice(0, 120);
  if (!name) return { ok: false, message: "Name is required" };

  const { error } = await supabase
    .from("lists")
    .update({
      name,
      description: (input.description ?? "").trim().slice(0, 4000),
      tags: normalizeTags(input.tags),
      is_ranked: Boolean(input.isRanked),
      is_public: input.isPublic !== false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.listId)
    .eq("user_id", user.id);

  if (error) return { ok: false, message: error.message };

  await revalidateListPaths(user.id, input.listId);
  return { ok: true, message: "List saved" };
}

export async function deleteList(listId: string): Promise<ListActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, message: "Sign in required" };

  const { error } = await supabase
    .from("lists")
    .delete()
    .eq("id", listId)
    .eq("user_id", user.id);

  if (error) return { ok: false, message: error.message };

  await revalidateListPaths(user.id);
  return { ok: true, message: "List deleted" };
}

export async function addListItem(
  listId: string,
  media: UnifiedMediaItem
): Promise<ListActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, message: "Sign in required" };

  if (!isMediaType(media.mediaType) || !media.id || !media.title.trim()) {
    return { ok: false, message: "Invalid media item" };
  }

  const { data: list } = await supabase
    .from("lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!list) return { ok: false, message: "List not found" };

  const { data: existing } = await supabase
    .from("list_items")
    .select("id")
    .eq("list_id", listId)
    .eq("media_type", media.mediaType)
    .eq("media_id", media.id)
    .maybeSingle();

  if (existing) return { ok: false, message: "Already on this list" };

  const { data: maxRow } = await supabase
    .from("list_items")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition =
    typeof maxRow?.position === "number" ? maxRow.position + 1 : 0;

  const { data: inserted, error } = await supabase
    .from("list_items")
    .insert({
      list_id: listId,
      user_id: user.id,
      media_id: media.id,
      media_type: media.mediaType,
      title: media.title.trim().slice(0, 300),
      creator: media.creator?.trim().slice(0, 300) || null,
      image_url: media.thumbnail,
      release_year: media.year || null,
      notes: "",
      position: nextPosition,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { ok: false, message: error?.message ?? "Could not add item" };
  }

  await touchListUpdatedAt(supabase, listId);
  await revalidateListPaths(user.id, listId);
  return { ok: true, message: "Added to list", itemId: inserted.id };
}

export async function removeListItem(
  listId: string,
  itemId: string
): Promise<ListActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, message: "Sign in required" };

  const { error } = await supabase
    .from("list_items")
    .delete()
    .eq("id", itemId)
    .eq("list_id", listId)
    .eq("user_id", user.id);

  if (error) return { ok: false, message: error.message };

  await touchListUpdatedAt(supabase, listId);
  await revalidateListPaths(user.id, listId);
  return { ok: true, message: "Removed from list" };
}

export async function updateListItemNotes(
  listId: string,
  itemId: string,
  notes: string
): Promise<ListActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, message: "Sign in required" };

  const { error } = await supabase
    .from("list_items")
    .update({ notes: notes.trim().slice(0, 2000) })
    .eq("id", itemId)
    .eq("list_id", listId)
    .eq("user_id", user.id);

  if (error) return { ok: false, message: error.message };

  await touchListUpdatedAt(supabase, listId);
  await revalidateListPaths(user.id, listId);
  return { ok: true, message: "Note saved" };
}

export async function reorderListItems(
  listId: string,
  orderedItemIds: string[]
): Promise<ListActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, message: "Sign in required" };

  if (!orderedItemIds.length) {
    return { ok: false, message: "Nothing to reorder" };
  }

  const { data: list } = await supabase
    .from("lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!list) return { ok: false, message: "List not found" };

  // Sequential updates keep positions unique without a temp swap table.
  for (let i = 0; i < orderedItemIds.length; i++) {
    const { error } = await supabase
      .from("list_items")
      .update({ position: i })
      .eq("id", orderedItemIds[i])
      .eq("list_id", listId)
      .eq("user_id", user.id);

    if (error) return { ok: false, message: error.message };
  }

  await touchListUpdatedAt(supabase, listId);
  await revalidateListPaths(user.id, listId);
  return { ok: true, message: "Order updated" };
}
