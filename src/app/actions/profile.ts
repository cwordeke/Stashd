"use server";

import { revalidatePath } from "next/cache";
import { parsePreferredCategories } from "@/lib/media-order";
import {
  getProfileByUserId,
  rowToProfile,
  type Profile,
  type ProfileRow,
} from "@/lib/profile";
import type { MediaType } from "@/lib/types";
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

  const profile = rowToProfile(data as ProfileRow);

  revalidatePath(`/u/${profile.username}`);
  revalidatePath("/profile");
  revalidatePath("/settings");

  return { ok: true, profile, message: "Bio saved" };
}

const AVATAR_BUCKET = "avatars";
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function avatarExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/jpeg":
    default:
      return "jpg";
  }
}

export async function updateProfileAvatar(
  formData: FormData
): Promise<ProfileActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in to update your profile picture" };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image to upload" };
  }

  if (!AVATAR_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      message: "Use a JPEG, PNG, WebP, or GIF image",
    };
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, message: "Image must be 5 MB or smaller" };
  }

  const ext = avatarExtension(file.type);
  const objectPath = `${user.id}/avatar.${ext}`;

  const { data: existing } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(user.id);

  const stalePaths =
    existing
      ?.filter((item) => item.name !== `avatar.${ext}`)
      .map((item) => `${user.id}/${item.name}`) ?? [];

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    return {
      ok: false,
      message: uploadError.message.includes("Bucket not found")
        ? `${uploadError.message} — run supabase/avatars_storage.sql in Supabase.`
        : uploadError.message,
    };
  }

  if (stalePaths.length > 0) {
    await supabase.storage.from(AVATAR_BUCKET).remove(stalePaths);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);

  // Bust CDN / browser caches when replacing the same path.
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id)
    .select("id, username, avatar_url, bio")
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  });

  const profile = rowToProfile(data as ProfileRow);

  revalidatePath(`/u/${profile.username}`);
  revalidatePath("/profile");
  revalidatePath("/settings");
  revalidatePath("/");

  return { ok: true, profile, message: "Profile picture updated" };
}

export async function updatePreferredCategories(
  categories: MediaType[]
): Promise<ProfileActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in to update preferences" };
  }

  const preferredCategories = parsePreferredCategories(categories);
  if (preferredCategories.length === 0) {
    return { ok: false, message: "Choose at least one media type" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ preferred_categories: preferredCategories })
    .eq("id", user.id)
    .select("id, username, avatar_url, bio, preferred_categories")
    .single();

  if (error) {
    return {
      ok: false,
      message: error.message.includes("preferred_categories")
        ? `${error.message} — run supabase/onboarding_profile.sql in Supabase.`
        : error.message,
    };
  }

  await supabase.auth.updateUser({
    data: { preferred_categories: preferredCategories },
  });

  const profile = rowToProfile(data as ProfileRow);

  revalidatePath(`/u/${profile.username}`);
  revalidatePath("/profile");
  revalidatePath("/settings");
  revalidatePath("/");

  return { ok: true, profile, message: "Preferences saved" };
}
