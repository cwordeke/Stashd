import type { JwtPayload } from "@supabase/supabase-js";

export const PROFILE_LOOKUP_TIMEOUT_MS = 3000;

type MetadataCarrier = {
  user_metadata?: Record<string, unknown>;
};

export function metaUsername(source: MetadataCarrier): string | null {
  const meta = source.user_metadata ?? {};
  return typeof meta.username === "string" && meta.username
    ? meta.username
    : null;
}

export function metaOnboardingCompleted(
  source: MetadataCarrier
): boolean | null {
  const value = source.user_metadata?.onboarding_completed;
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

export function metaTutorialCompleted(
  source: MetadataCarrier
): boolean | null {
  const value = source.user_metadata?.tutorial_completed;
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

export function metaTutorialStep(source: MetadataCarrier): number | null {
  const value = source.user_metadata?.tutorial_step;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Legacy accounts may only have a username; treat that as onboarding complete. */
export function isOnboardingDone(
  username: string | null,
  onboardingCompleted: boolean | null
): boolean {
  return (
    onboardingCompleted === true ||
    (onboardingCompleted !== false && Boolean(username))
  );
}

export function claimsFromJwt(
  claims: JwtPayload | null | undefined
): { userId: string | null; username: string | null; onboardingCompleted: boolean | null } {
  if (!claims?.sub) {
    return { userId: null, username: null, onboardingCompleted: null };
  }

  return {
    userId: claims.sub,
    username: metaUsername(claims),
    onboardingCompleted: metaOnboardingCompleted(claims),
  };
}
