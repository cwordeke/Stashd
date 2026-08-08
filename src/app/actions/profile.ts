"use server";

import { revalidatePath } from "next/cache";
import {
  getProfileByUserId,
  rowToProfile,
  type Profile,
} from "@/lib/profile";
import { createClient } from "@/utils/supabase/server";
import { normalizeUsername, validateUsername } from "@/lib/username";

export type ProfileActionResult =
  | { ok: true; profile: Profile; message: string }
  | { ok: false; message: string };

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
      bio: null,
    })
    .select("id, username, avatar_url, bio")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "That username is already taken" };
    }
    return { ok: false, message: error.message };
  }

  // Keep username on the JWT so middleware/shell skip profile lookups.
  await supabase.auth.updateUser({
    data: { username: normalized },
  });

  const profile = rowToProfile(
    data as {
      id: string;
      username: string;
      avatar_url: string | null;
      bio: string | null;
    }
  );
  revalidatePath("/onboarding");
  revalidatePath(`/u/${profile.username}`);
  revalidatePath("/");

  return {
    ok: true,
    profile,
    message: "Username claimed",
  };
}

const BIO_MAX_LENGTH = 280;

export async function updateProfileBio(
  bio: string
): Promise<ProfileActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in to update your bio" };
  }

  const trimmed = bio.trim();
  if (trimmed.length > BIO_MAX_LENGTH) {
    return {
      ok: false,
      message: `Bio must be ${BIO_MAX_LENGTH} characters or fewer`,
    };
  }

  const nextBio = trimmed.length > 0 ? trimmed : null;

  const { data, error } = await supabase
    .from("profiles")
    .update({ bio: nextBio })
    .eq("id", user.id)
    .select("id, username, avatar_url, bio")
    .single();

  if (error) {
    return {
      ok: false,
      message: error.message.includes("bio")
        ? `${error.message} — run supabase/profiles_bio.sql in Supabase.`
        : error.message,
    };
  }

  const profile = rowToProfile(
    data as {
      id: string;
      username: string;
      avatar_url: string | null;
      bio: string | null;
    }
  );

  revalidatePath(`/u/${profile.username}`);
  revalidatePath("/profile");

  return { ok: true, profile, message: "Bio saved" };
}
