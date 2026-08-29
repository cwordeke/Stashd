"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { profilePath } from "@/lib/auth";
import { claimsFromJwt, isOnboardingDone } from "@/lib/jwt-auth";
import { createClient } from "@/utils/supabase/client";

/**
 * Non-blocking redirect for signed-in users visiting /login.
 * Runs client-side after the login shell renders — never in middleware.
 */
export default function LoginAuthenticatedRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getClaims();

      if (cancelled || error || !data?.claims) {
        return;
      }

      const summary = claimsFromJwt(data.claims);
      if (!summary.userId) {
        return;
      }

      const dest = isOnboardingDone(summary.username, summary.onboardingCompleted)
        ? profilePath(summary.username)
        : "/onboarding";

      router.replace(dest);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
