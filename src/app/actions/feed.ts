"use server";

import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { completedStatusFor } from "@/lib/media-status";
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
  verb: string;
}

export interface FeedFollowItem {
  kind: "follow";
  id: string;
  createdAt: string;
  actor: FeedActor;
  target: { id: string; username: string };
}

export type FeedItem = FeedLogItem | FeedFollowItem;

interface ProfileEmbed {
  username: string;
  avatar_url: string | null;
}

function embedProfile(value: unknown): ProfileEmbed | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const rec = row as Record<string, unknown>;
  if (typeof rec.username !== "string" || !rec.username) return null;
  return {
    username: rec.username,
    avatar_url: typeof rec.avatar_url === "string" ? rec.avatar_url : null,
  };
}

function asRating(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function verbFor(mediaType: MediaType): string {
  return completedStatusFor(mediaType);
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

  if (followingError || !followingRows?.length) return [];

  const followingIds = followingRows
    .map((row) => row.following_id)
    .filter((id): id is string => typeof id === "string");

  if (followingIds.length === 0) return [];

  const [logsResult, followsResult] = await Promise.all([
    supabase
      .from("diary_entries")
      .select(
        `
        id,
        user_id,
        media_id,
        media_type,
        title,
        creator,
        image_url,
        release_year,
        rating,
        watched_on,
        created_at,
        profile:profiles!user_id (
          username,
          avatar_url
        )
      `
      )
      .in("user_id", followingIds)
      .order("created_at", { ascending: false })
      .limit(SOURCE_LIMIT),
    supabase
      .from("follows")
      .select(
        `
        follower_id,
        following_id,
        created_at,
        follower:profiles!follower_id (
          username,
          avatar_url
        ),
        target:profiles!following_id (
          username
        )
      `
      )
      .in("follower_id", followingIds)
      .order("created_at", { ascending: false })
      .limit(SOURCE_LIMIT),
  ]);

  const items: FeedItem[] = [];

  for (const row of logsResult.data ?? []) {
    const rec = row as Record<string, unknown>;
    const mediaTypeRaw = rec.media_type;
    if (typeof mediaTypeRaw !== "string" || !isMediaType(mediaTypeRaw)) continue;
    const mediaType = mediaTypeRaw;

    const profile = embedProfile(rec.profile);
    const userId = typeof rec.user_id === "string" ? rec.user_id : "";
    const id = typeof rec.id === "string" ? rec.id : "";
    if (!profile || !userId || !id) continue;

    const mediaId =
      typeof rec.media_id === "string" ? rec.media_id : String(rec.media_id ?? "");
    if (!mediaId) continue;

    const createdAt =
      (typeof rec.created_at === "string" && rec.created_at) ||
      (typeof rec.watched_on === "string" && rec.watched_on) ||
      "";
    if (!createdAt) continue;

    items.push({
      kind: "log",
      id: `log:${id}`,
      createdAt,
      actor: {
        id: userId,
        username: profile.username,
        avatarUrl: profile.avatar_url,
      },
      media: {
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
      },
      rating: asRating(rec.rating),
      verb: verbFor(mediaType),
    });
  }

  for (const row of followsResult.data ?? []) {
    const rec = row as Record<string, unknown>;
    const followerId =
      typeof rec.follower_id === "string" ? rec.follower_id : "";
    const targetId =
      typeof rec.following_id === "string" ? rec.following_id : "";
    const createdAt = typeof rec.created_at === "string" ? rec.created_at : "";
    const follower = embedProfile(rec.follower);
    const target = embedProfile(rec.target);
    if (!followerId || !targetId || !createdAt || !follower || !target) continue;

    items.push({
      kind: "follow",
      id: `follow:${followerId}:${targetId}`,
      createdAt,
      actor: {
        id: followerId,
        username: follower.username,
        avatarUrl: follower.avatar_url,
      },
      target: { id: targetId, username: target.username },
    });
  }

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return items.slice(0, FEED_LIMIT);
}

export const getSocialFeed = cache(loadSocialFeed);
