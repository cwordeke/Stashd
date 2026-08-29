import { cache } from "react";
import {
  parsePreferredCategories,
  resolvePreferredCategories,
} from "@/lib/media-order";
import { claimsFromJwt, type ClaimsSummary } from "@/lib/jwt-auth";
import { createClient } from "@/utils/supabase/server";
import { normalizeUsername } from "@/lib/username";
import type { MediaType } from "@/lib/types";

export interface Profile {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  preferredCategories: MediaType[];
}

export interface ProfileRow {
  id: string;
  username: string;
  avatar_url: string | null;
  bio?: string | null;
  preferred_categories?: unknown;
}

export function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_url,
    bio: row.bio ?? null,
    preferredCategories: parsePreferredCategories(row.preferred_categories),
  };
}

async function selectProfile(
  filter: { column: "id" | "username"; value: string }
): Promise<Profile | null> {
  const supabase = await createClient();

  const withPrefs = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio, preferred_categories")
    .eq(filter.column, filter.value)
    .maybeSingle();

  if (!withPrefs.error && withPrefs.data) {
    return rowToProfile(withPrefs.data as ProfileRow);
  }

  const withBio = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .eq(filter.column, filter.value)
    .maybeSingle();

  if (!withBio.error && withBio.data) {
    return rowToProfile(withBio.data as ProfileRow);
  }

  const withoutBio = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq(filter.column, filter.value)
    .maybeSingle();

  if (withoutBio.error || !withoutBio.data) return null;
  return rowToProfile({ ...(withoutBio.data as ProfileRow), bio: null });
}

export const getProfileByUserId = cache(
  async (userId: string): Promise<Profile | null> => {
    return selectProfile({ column: "id", value: userId });
  }
);

export const getAuthClaims = cache(async (): Promise<ClaimsSummary> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    console.error("[auth] getClaims failed", { message: error.message });
  }

  return claimsFromJwt(data?.claims);
});

/** Username only — avoids the multi-fallback profile select on hot paths like `/`. */
export const getProfileUsernameByUserId = cache(
  async (userId: string): Promise<string | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[profile] username lookup failed", { message: error.message });
      return null;
    }

    return typeof data?.username === "string" ? data.username : null;
  }
);

export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[auth] getUser failed", { message: error.message });
  }

  return user ?? null;
});

export const getOwnProfile = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser();

  if (!user) return null;
  const profile = await getProfileByUserId(user.id);
  if (!profile) return null;

  return {
    ...profile,
    preferredCategories: resolvePreferredCategories(
      profile.preferredCategories,
      user.user_metadata?.preferred_categories
    ),
  };
});

export const getProfileByUsername = cache(
  async (username: string): Promise<Profile | null> => {
    return selectProfile({
      column: "username",
      value: normalizeUsername(username),
    });
  }
);
