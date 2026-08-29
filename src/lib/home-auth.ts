import { cache } from "react";
import { createRequestTimer } from "@/lib/request-timing";
import { withTimeout } from "@/lib/with-timeout";
import {
  getAuthClaims,
  getProfileUsernameByUserId,
} from "@/lib/profile";
import type { ClaimsSummary } from "@/lib/jwt-auth";

const HOME_AUTH_TIMEOUT_MS = 3_500;
const HOME_PROFILE_TIMEOUT_MS = 3_500;

const ANONYMOUS_CLAIMS: ClaimsSummary = {
  userId: null,
  username: null,
  onboardingCompleted: null,
};

export interface HomeAuthState {
  signedIn: boolean;
  userId?: string;
  username?: string;
}

/**
 * Lightweight auth state for the public homepage.
 * Uses local JWT claims (not `getUser()`) plus an optional username lookup.
 */
export const getHomeAuthState = cache(async (): Promise<HomeAuthState> => {
  const timer = createRequestTimer("home");
  timer.mark("auth-start");

  const claims = await withTimeout(
    getAuthClaims(),
    HOME_AUTH_TIMEOUT_MS,
    ANONYMOUS_CLAIMS
  );

  if (!claims.userId) {
    timer.mark("auth-anonymous", { timedOutOrGuest: true });
    return { signedIn: false };
  }

  timer.mark("auth-claims-ready");

  let username = claims.username ?? undefined;
  if (!username) {
    const fromProfile = await withTimeout(
      getProfileUsernameByUserId(claims.userId),
      HOME_PROFILE_TIMEOUT_MS,
      null
    );
    username = fromProfile ?? undefined;
  }

  timer.mark("auth-profile-ready", {
    signedIn: true,
    hasUsername: Boolean(username),
  });

  return {
    signedIn: true,
    userId: claims.userId,
    username,
  };
});
