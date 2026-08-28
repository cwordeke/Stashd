import type { SupabaseClient } from "@supabase/supabase-js";
import { metaOnboardingCompleted, metaUsername } from "@/lib/jwt-auth";

/**
 * Align JWT user_metadata with the profiles row after OAuth or for legacy accounts.
 * Safe to call from auth callback and other one-off server flows (not middleware).
 */
export async function syncAuthMetadataFromProfile(
  supabase: SupabaseClient
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const username = metaUsername(user);
  const onboardingCompleted = metaOnboardingCompleted(user);

  if (username && onboardingCompleted !== null) return;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, onboarding_completed, preferred_categories")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[syncAuthMetadataFromProfile] profile lookup failed", {
      code: error.code,
    });
  }

  if (profile?.username) {
    const nextOnboarding =
      typeof profile.onboarding_completed === "boolean"
        ? profile.onboarding_completed
        : true;

    await supabase.auth.updateUser({
      data: {
        username: profile.username,
        onboarding_completed: nextOnboarding,
        ...(profile.preferred_categories != null
          ? { preferred_categories: profile.preferred_categories }
          : {}),
      },
    });
    return;
  }

  if (onboardingCompleted === null) {
    await supabase.auth.updateUser({
      data: { onboarding_completed: false },
    });
  }
}
