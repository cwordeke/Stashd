"use server";

import { revalidatePath } from "next/cache";
import { parsePreferredCategories } from "@/lib/media-order";
import type { MediaType } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";
import { normalizeUsername, validateUsername } from "@/lib/username";

export interface OnboardingData {
  username: string;
  preferredCategories: MediaType[];
}

export type OnboardingActionResult =
  | { ok: true; username: string }
  | { ok: false; message: string };

export async function checkUsernameAvailable(
  username: string
): Promise<{ available: boolean; message: string | null }> {
  const validationError = validateUsername(username);
  if (validationError) {
    return { available: false, message: validationError };
  }

  const normalized = normalizeUsername(username);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", normalized)
    .maybeSingle();

  if (data?.id && data.id !== user?.id) {
    return { available: false, message: "Username taken" };
  }

  return { available: true, message: null };
}

export async function completeOnboarding(
  data: OnboardingData
): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in to finish onboarding" };
  }

  const validationError = validateUsername(data.username);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const username = normalizeUsername(data.username);
  const preferredCategories = parsePreferredCategories(data.preferredCategories);

  const taken = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (taken.data?.id && taken.data.id !== user.id) {
    return { ok: false, message: "Username taken" };
  }

  const meta = user.user_metadata ?? {};
  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;

  const payload = {
    id: user.id,
    username,
    avatar_url: avatarUrl,
    onboarding_completed: true,
    tutorial_completed: false,
  };

  const { error } = await supabase.from("profiles").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    const { error: fallback } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        username,
        avatar_url: avatarUrl,
      },
      { onConflict: "id" }
    );

    if (fallback) {
      if (fallback.code === "23505") {
        return { ok: false, message: "Username taken" };
      }
      return { ok: false, message: fallback.message };
    }
  }

  await supabase
    .from("profiles")
    .update({ preferred_categories: preferredCategories })
    .eq("id", user.id);

  await supabase.auth.updateUser({
    data: {
      username,
      onboarding_completed: true,
      tutorial_completed: false,
      preferred_categories: preferredCategories,
    },
  });

  await supabase.auth.refreshSession();

  revalidatePath(`/u/${username}`);

  return { ok: true, username };
}
