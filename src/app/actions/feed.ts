"use server";

import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { mediaStatusLabels } from "@/lib/media-status";
import {
  isMediaType,
  type MediaType,
  type UnifiedMediaItem,
} from "@/lib/types";

const FEED_LIMIT = 50;
const SOURCE_LIMIT = 40;

export interface FeedActor {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface FeedLogItem {
  kind: "log";
  id: string;
  createdAt: string;
  actor: FeedActor;
  media: UnifiedMediaItem;
  rating: number | null;
  reviewText: string | null;
  verb: string;
}

export interface FeedFollowItem {
  kind: "follow";
  id: string;
  createdAt: string;
  actor: FeedActor;
  target: { id: string; username: string };
}

export interface FeedRateItem {
  kind: "rate";
  id: string;
  createdAt: string;
  actor: FeedActor;
  media: UnifiedMediaItem;
  rating: number;
}

export interface FeedStashItem {
  kind: "stash";
  id: string;
  createdAt: string;
  actor: FeedActor;
  media: UnifiedMediaItem;
}

export interface FeedListItem {
  kind: "list";
  id: string;
  createdAt: string;
  actor: FeedActor;
  media: UnifiedMediaItem;
  list: { id: string; name: string };
}

export type FeedItem =
  | FeedLogItem
  | FeedFollowItem
  | FeedRateItem
  | FeedStashItem
  | FeedListItem;

function asRating(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function verbFor(mediaType: MediaType): string {
  return mediaStatusLabels(mediaType).completed;
}

function feedTimestamp(value: string): number {
  const dateOnly = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly) && value.length <= 10) {
    const [year, month, day] = dateOnly.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function rowMedia(
  rec: Record<string, unknown>,
  mediaType: MediaType
): UnifiedMediaItem | null {
  const mediaId =
    typeof rec.media_id === "string" ? rec.media_id : String(rec.media_id ?? "");
  if (!mediaId) return null;

  return {
    id: mediaId,
    mediaType,
    title: typeof rec.title === "string" && rec.title ? rec.title : "Untitled",
    creator:
      typeof rec.creator === "string" && rec.creator ? rec.creator : "—",
    year:
      typeof rec.release_year === "string" && rec.release_year
        ? rec.release_year
        : "—",
    thumbnail: typeof rec.image_url === "string" ? rec.image_url : null,
  };
}

async function profilesByUserIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[]
): Promise<Map<string, FeedActor>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", unique);

  if (error) {
    console.error("[getSocialFeed] profiles:", error.message);
    return new Map();
  }

  const map = new Map<string, FeedActor>();
  for (const row of data ?? []) {
    if (typeof row.id !== "string" || typeof row.username !== "string") continue;
    map.set(row.id, {
      id: row.id,
      username: row.username,
      avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
    });
  }
  return map;
}

function actorFrom(
  profiles: Map<string, FeedActor>,
  userId: string
): FeedActor | null {
  return profiles.get(userId) ?? null;
}

async function loadSocialFeed(): Promise<FeedItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: followingRows, error: followingError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  if (followingError) {
    console.error("[getSocialFeed] following:", followingError.message);
    return [];
  }

  const followingIds = (followingRows ?? [])
    .map((row) => row.following_id)
    .filter((id): id is string => typeof id === "string");

  if (followingIds.length === 0) return [];

  const [
    logsResult,
    followsResult,
    ratingsResult,
    stashResult,
    listItemsResult,
  ] = await Promise.all([
    supabase
      .from("diary_entries")
      .select(
        "id, user_id, media_id, media_type, title, image_url, release_year, rating, watched_on, created_at, review_text"
      )
      .in("user_id", followingIds)
      .order("created_at", { ascending: false })
      .limit(SOURCE_LIMIT),
    supabase
      .from("follows")
      .select("follower_id, following_id, created_at")
      .in("follower_id", followingIds)
      .order("created_at", { ascending: false })
      .limit(SOURCE_LIMIT),
    supabase
      .from("user_ratings")
      .select(
        "id, user_id, media_id, media_type, title, creator, image_url, release_year, rating, updated_at, created_at"
      )
      .in("user_id", followingIds)
      .order("updated_at", { ascending: false })
      .limit(SOURCE_LIMIT),
    supabase
      .from("stash_items")
      .select(
        "id, user_id, media_id, media_type, title, creator, image_url, release_year, created_at"
      )
      .in("user_id", followingIds)
      .order("created_at", { ascending: false })
      .limit(SOURCE_LIMIT),
    supabase
      .from("list_items")
      .select(
        "id, user_id, list_id, media_id, media_type, title, creator, image_url, release_year, created_at"
      )
      .in("user_id", followingIds)
      .order("created_at", { ascending: false })
      .limit(SOURCE_LIMIT),
  ]);

  if (logsResult.error) {
    console.error("[getSocialFeed] diary:", logsResult.error.message);
  }
  if (followsResult.error) {
    console.error("[getSocialFeed] follows:", followsResult.error.message);
  }
  if (ratingsResult.error) {
    console.error("[getSocialFeed] ratings:", ratingsResult.error.message);
  }
  if (stashResult.error) {
    console.error("[getSocialFeed] stash:", stashResult.error.message);
  }
  if (listItemsResult.error) {
    console.error("[getSocialFeed] list items:", listItemsResult.error.message);
  }

  const profileIds = new Set<string>();
  for (const row of logsResult.data ?? []) {
    if (typeof row.user_id === "string") profileIds.add(row.user_id);
  }
  for (const row of followsResult.data ?? []) {
    if (typeof row.follower_id === "string") profileIds.add(row.follower_id);
    if (typeof row.following_id === "string") profileIds.add(row.following_id);
  }
  for (const row of ratingsResult.data ?? []) {
    if (typeof row.user_id === "string") profileIds.add(row.user_id);
  }
  for (const row of stashResult.data ?? []) {
    if (typeof row.user_id === "string") profileIds.add(row.user_id);
  }
  for (const row of listItemsResult.data ?? []) {
    if (typeof row.user_id === "string") profileIds.add(row.user_id);
  }

  const profiles = await profilesByUserIds(supabase, [...profileIds]);

  const listIds = [
    ...new Set(
      (listItemsResult.data ?? [])
        .map((row) => row.list_id)
        .filter((id): id is string => typeof id === "string")
    ),
  ];

  const listNames = new Map<string, string>();
  if (listIds.length > 0) {
    const { data: listRows, error: listError } = await supabase
      .from("lists")
      .select("id, name, is_public, user_id")
      .in("id", listIds);

    if (listError) {
      console.error("[getSocialFeed] lists:", listError.message);
    } else {
      for (const row of listRows ?? []) {
        if (typeof row.id !== "string" || typeof row.name !== "string") continue;
        const ownerId = typeof row.user_id === "string" ? row.user_id : "";
        const isPublic = Boolean(row.is_public);
        if (isPublic || followingIds.includes(ownerId)) {
          listNames.set(row.id, row.name);
        }
      }
    }
  }

  const items: FeedItem[] = [];

  for (const row of logsResult.data ?? []) {
    const rec = row as Record<string, unknown>;
    const mediaTypeRaw = rec.media_type;
    if (typeof mediaTypeRaw !== "string" || !isMediaType(mediaTypeRaw)) continue;

    const userId = typeof rec.user_id === "string" ? rec.user_id : "";
    const id = typeof rec.id === "string" ? rec.id : "";
    const actor = actorFrom(profiles, userId);
    const media = rowMedia(rec, mediaTypeRaw);
    if (!actor || !id || !media) continue;

    const createdAt =
      (typeof rec.created_at === "string" && rec.created_at) ||
      (typeof rec.watched_on === "string" && rec.watched_on) ||
      "";
    if (!createdAt) continue;

    const reviewRaw = rec.review_text;
    const reviewText =
      typeof reviewRaw === "string" && reviewRaw.trim() ? reviewRaw.trim() : null;

    items.push({
      kind: "log",
      id: `log:${id}`,
      createdAt,
      actor,
      media,
      rating: asRating(rec.rating),
      reviewText,
      verb: verbFor(mediaTypeRaw),
    });
  }

  for (const row of followsResult.data ?? []) {
    const rec = row as Record<string, unknown>;
    const followerId =
      typeof rec.follower_id === "string" ? rec.follower_id : "";
    const targetId =
      typeof rec.following_id === "string" ? rec.following_id : "";
    const createdAt = typeof rec.created_at === "string" ? rec.created_at : "";
    const actor = actorFrom(profiles, followerId);
    const target = actorFrom(profiles, targetId);
    if (!followerId || !targetId || !createdAt || !actor || !target) continue;

    items.push({
      kind: "follow",
      id: `follow:${followerId}:${targetId}:${createdAt}`,
      createdAt,
      actor,
      target: { id: targetId, username: target.username },
    });
  }

  for (const row of ratingsResult.data ?? []) {
    const rec = row as Record<string, unknown>;
    const mediaTypeRaw = rec.media_type;
    if (typeof mediaTypeRaw !== "string" || !isMediaType(mediaTypeRaw)) continue;

    const userId = typeof rec.user_id === "string" ? rec.user_id : "";
    const id = typeof rec.id === "string" ? rec.id : "";
    const actor = actorFrom(profiles, userId);
    const media = rowMedia(rec, mediaTypeRaw);
    const rating = asRating(rec.rating);
    if (!actor || !id || !media || rating == null) continue;

    const createdAt =
      (typeof rec.updated_at === "string" && rec.updated_at) ||
      (typeof rec.created_at === "string" && rec.created_at) ||
      "";
    if (!createdAt) continue;

    items.push({
      kind: "rate",
      id: `rate:${id}:${createdAt}`,
      createdAt,
      actor,
      media,
      rating,
    });
  }

  for (const row of stashResult.data ?? []) {
    const rec = row as Record<string, unknown>;
    const mediaTypeRaw = rec.media_type;
    if (typeof mediaTypeRaw !== "string" || !isMediaType(mediaTypeRaw)) continue;

    const userId = typeof rec.user_id === "string" ? rec.user_id : "";
    const id = typeof rec.id === "string" ? rec.id : "";
    const actor = actorFrom(profiles, userId);
    const media = rowMedia(rec, mediaTypeRaw);
    const createdAt =
      typeof rec.created_at === "string" ? rec.created_at : "";
    if (!actor || !id || !media || !createdAt) continue;

    items.push({
      kind: "stash",
      id: `stash:${id}`,
      createdAt,
      actor,
      media,
    });
  }

  for (const row of listItemsResult.data ?? []) {
    const rec = row as Record<string, unknown>;
    const mediaTypeRaw = rec.media_type;
    if (typeof mediaTypeRaw !== "string" || !isMediaType(mediaTypeRaw)) continue;

    const userId = typeof rec.user_id === "string" ? rec.user_id : "";
    const listId = typeof rec.list_id === "string" ? rec.list_id : "";
    const id = typeof rec.id === "string" ? rec.id : "";
    const actor = actorFrom(profiles, userId);
    const media = rowMedia(rec, mediaTypeRaw);
    const listName = listNames.get(listId);
    const createdAt =
      typeof rec.created_at === "string" ? rec.created_at : "";
    if (!actor || !id || !media || !listId || !listName || !createdAt) continue;

    items.push({
      kind: "list",
      id: `list:${id}`,
      createdAt,
      actor,
      media,
      list: { id: listId, name: listName },
    });
  }

  items.sort((a, b) => feedTimestamp(b.createdAt) - feedTimestamp(a.createdAt));
  return items.slice(0, FEED_LIMIT);
}

export const getSocialFeed = cache(loadSocialFeed);
