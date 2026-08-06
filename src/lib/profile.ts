import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { normalizeUsername } from "@/lib/username";

export interface Profile {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface ProfileRow {
  id: string;
  username: string;
  avatar_url: string | null;
}

export function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_url,
  };
}

export const getProfileByUserId = cache(
  async (userId: string): Promise<Profile | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return rowToProfile(data as ProfileRow);
  }
);

export const getOwnProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return getProfileByUserId(user.id);
});

export const getProfileByUsername = cache(
  async (username: string): Promise<Profile | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("username", normalizeUsername(username))
      .maybeSingle();

    if (error || !data) return null;
    return rowToProfile(data as ProfileRow);
  }
);
