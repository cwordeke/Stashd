import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { normalizeUsername } from "@/lib/username";

export interface Profile {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
}

interface ProfileRow {
  id: string;
  username: string;
  avatar_url: string | null;
  bio?: string | null;
}

export function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_url,
    bio: row.bio ?? null,
  };
}

async function selectProfile(
  filter: { column: "id" | "username"; value: string }
): Promise<Profile | null> {
  const supabase = await createClient();

  const withBio = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .eq(filter.column, filter.value)
    .maybeSingle();

  if (!withBio.error && withBio.data) {
    return rowToProfile(withBio.data as ProfileRow);
  }

  // Fallback before bio column migration is applied
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
    return selectProfile({
      column: "username",
      value: normalizeUsername(username),
    });
  }
);
