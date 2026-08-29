import { redirect } from "next/navigation";
import { profilePath } from "@/lib/auth";
import {
  claimsFromJwt,
  isOnboardingDone,
  type ClaimsSummary,
} from "@/lib/jwt-auth";
import { createClient } from "@/utils/supabase/server";

export async function getServerClaims(): Promise<ClaimsSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    console.error("[auth-guards] getClaims failed", { message: error.message });
  }

  return claimsFromJwt(data?.claims);
}

/** Redirect anonymous users to login before rendering a protected page. */
export async function requireAuthenticatedUser(
  nextPath: string
): Promise<ClaimsSummary> {
  const claims = await getServerClaims();

  if (!claims.userId) {
    const params = new URLSearchParams({ next: nextPath });
    redirect(`/login?${params.toString()}`);
  }

  return claims;
}

/** Redirect users who still need onboarding before account-only pages. */
export async function requireCompletedOnboarding(
  nextPath: string
): Promise<ClaimsSummary> {
  const claims = await requireAuthenticatedUser(nextPath);

  if (!isOnboardingDone(claims.username, claims.onboardingCompleted)) {
    redirect("/onboarding");
  }

  return claims;
}

/** Keep /login and signup surfaces for anonymous users only. */
export async function redirectAuthenticatedFromAuthEntry(): Promise<void> {
  const claims = await getServerClaims();

  if (!claims.userId) {
    return;
  }

  if (isOnboardingDone(claims.username, claims.onboardingCompleted)) {
    redirect(profilePath(claims.username));
  }

  redirect("/onboarding");
}
