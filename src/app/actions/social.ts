"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export interface FollowStats {
  followers: number;
  following: number;
}

export interface SocialUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

export type FollowActionResult =
  | { ok: true; isFollowing: boolean }
  | { ok: false; message: string };

const USER_SEARCH_LIMIT = 12;
const USER_SEARCH_MAX_LEN = 32;

function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function usernamesByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", unique);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (typeof row.id === "string" && typeof row.username === "string") {
      map.set(row.id, row.username);
    }
  }
  return map;
}

export async function toggleFollow(
  targetUserId: string,
  isCurrentlyFollowing: boolean
): Promise<FollowActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in to follow users" };
  }

  if (!targetUserId) {
    return { ok: false, message: "Invalid user" };
  }

  if (user.id === targetUserId) {
    return { ok: false, message: "You cannot follow yourself" };
  }

  if (isCurrentlyFollowing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId);

    if (error) {
      return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase.from("follows").insert({
      follower_id: user.id,
      following_id: targetUserId,
    });

    if (error && error.code !== "23505") {
      return { ok: false, message: error.message };
    }
  }

  const names = await usernamesByIds(supabase, [user.id, targetUserId]);
  for (const username of names.values()) {
    revalidatePath(`/u/${username}`);
  }
  revalidatePath("/");

  return { ok: true, isFollowing: !isCurrentlyFollowing };
}

export async function getProfileFollowStats(
  targetUserId: string
): Promise<FollowStats> {
  if (!targetUserId) {
    return { followers: 0, following: 0 };
  }

  const supabase = await createClient();

  const [followersResult, followingResult] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", targetUserId),
    supabase
      .from("follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", targetUserId),
  ]);

  return {
    followers: followersResult.count ?? 0,
    following: followingResult.count ?? 0,
  };
}

export async function checkIfFollowing(targetUserId: string): Promise<boolean> {
  if (!targetUserId) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id === targetUserId) return false;

  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

export async function searchUsers(query: string): Promise<SocialUser[]> {
  const trimmed = query.trim().replace(/^@+/, "").slice(0, USER_SEARCH_MAX_LEN);
  if (!trimmed) return [];

  const supabase = await createClient();
  const pattern = `%${escapeIlike(trimmed)}%`;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .ilike("username", pattern)
    .order("username", { ascending: true })
    .limit(USER_SEARCH_LIMIT);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    username: row.username as string,
    avatar_url: (row.avatar_url as string | null) ?? null,
  }));
}
