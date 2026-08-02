"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { normalizeUsername, validateUsername } from "@/lib/username";

export interface Profile {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export type ProfileActionResult =
  | { ok: true; profile: Profile; message: string }
  | { ok: false; message: string };

interface ProfileRow {
  id: string;
  username: string;
  avatar_url: string | null;
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_url,
  };
}

export async function getProfileByUserId(
  userId: string
): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToProfile(data as ProfileRow);
}

export async function getOwnProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return getProfileByUserId(user.id);
}

export async function getProfileByUsername(
  username: string
): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("username", normalizeUsername(username))
    .maybeSingle();

  if (error || !data) return null;
  return rowToProfile(data as ProfileRow);
}

export async function claimUsername(
  username: string
): Promise<ProfileActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in to claim a username" };
  }

  const validationError = validateUsername(username);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const normalized = normalizeUsername(username);

  const existing = await getProfileByUserId(user.id);
  if (existing) {
    return {
      ok: true,
      profile: existing,
      message: "Username already claimed",
    };
  }

  const meta = user.user_metadata ?? {};
  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username: normalized,
      avatar_url: avatarUrl,
    })
    .select("id, username, avatar_url")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "That username is already taken" };
    }
    return { ok: false, message: error.message };
  }

  const profile = rowToProfile(data as ProfileRow);
  revalidatePath("/onboarding");
  revalidatePath(`/u/${profile.username}`);
  revalidatePath("/");

  return {
    ok: true,
    profile,
    message: "Username claimed",
  };
}
