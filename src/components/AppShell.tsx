"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NavigationPendingProvider, useNavigationPending } from "@/context/NavigationPendingContext";
import { StashProvider } from "@/context/StashContext";
import Navbar from "@/components/Navbar";
import MobileTabBar from "@/components/MobileTabBar";
import AppTutorialGate from "@/components/tutorial/AppTutorialGate";
import { PendingRouteView } from "@/components/PendingRouteView";
import { metaTutorialCompleted, metaTutorialStep } from "@/lib/jwt-auth";
import { toAuthUserSummary, type AuthUserSummary } from "@/lib/auth";
import { parsePreferredCategories } from "@/lib/media-order";
import { PROFILE_UPDATED_EVENT } from "@/lib/profile-events";
import { TUTORIAL_REPLAY_EVENT } from "@/lib/tutorial-events";
import { shouldShowTutorialOverlay } from "@/lib/tutorial-visibility";
import {
  createClient,
  syncBrowserSessionFromCookies,
} from "@/utils/supabase/client";

interface AppShellProps {
  children: React.ReactNode;
}

function usernameFromUser(user: {
  user_metadata?: Record<string, unknown>;
}): string | null {
  const meta = user.user_metadata ?? {};
  return typeof meta.username === "string" ? meta.username : null;
}

function readTutorialStep(
  user: { user_metadata?: Record<string, unknown> },
  profile: { tutorial_step?: unknown } | null
): number {
  const fromJwt = metaTutorialStep(user);
  if (fromJwt !== null) return fromJwt;
  if (typeof profile?.tutorial_step === "number") return profile.tutorial_step;
  return 0;
}

function MainContent({ children }: { children: React.ReactNode }) {
  const { pendingHref } = useNavigationPending();

  return (
    <main className="flex-1 pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
      {pendingHref ? <PendingRouteView /> : children}
    </main>
  );
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUserSummary | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialReplayPending, setTutorialReplayPending] = useState(false);
  const [tutorialKey, setTutorialKey] = useState(0);

  const syncUser = useCallback(async () => {
    const supabase = createClient();
    await syncBrowserSessionFromCookies();

    const {
      data: { user: nextUser },
    } = await supabase.auth.getUser();

    if (!nextUser) {
      setUser(null);
      setTutorialActive(false);
      setAuthReady(true);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "username, avatar_url, preferred_categories, tutorial_completed, tutorial_step"
      )
      .eq("id", nextUser.id)
      .maybeSingle();

    const profileUsername =
      typeof profile?.username === "string" ? profile.username : null;
    const username = profileUsername ?? usernameFromUser(nextUser);
    const preferred = parsePreferredCategories(
      profile?.preferred_categories ??
        nextUser.user_metadata?.preferred_categories
    );
    const profileAvatar =
      typeof profile?.avatar_url === "string" ? profile.avatar_url : null;

    if (profileUsername && !usernameFromUser(nextUser)) {
      void supabase.auth.updateUser({
        data: {
          username: profileUsername,
          onboarding_completed: true,
          preferred_categories: preferred,
        },
      });
    }

    setUser(
      toAuthUserSummary(nextUser, username, preferred, profileAvatar)
    );

    const fromJwt = metaTutorialCompleted(nextUser);
    const fromProfile =
      typeof profile?.tutorial_completed === "boolean"
        ? profile.tutorial_completed
        : null;
    const tutorialDone =
      fromJwt !== null ? fromJwt : fromProfile !== null ? fromProfile : true;

    setTutorialStep(readTutorialStep(nextUser, profile));
    setTutorialActive((current) => {
      if (tutorialReplayPending) return true;
      if (current && !tutorialDone) return true;
      return Boolean(username) && !tutorialDone;
    });
    setAuthReady(true);
  }, [tutorialReplayPending]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await syncUser();
      if (cancelled) return;
    })();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncUser();
    });

    const onProfileUpdated = () => {
      void syncUser();
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);

    const onTutorialReplay = () => {
      setTutorialReplayPending(true);
      setTutorialStep(0);
      setTutorialActive(true);
      setTutorialKey((key) => key + 1);
    };
    window.addEventListener(TUTORIAL_REPLAY_EVENT, onTutorialReplay);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
      window.removeEventListener(TUTORIAL_REPLAY_EVENT, onTutorialReplay);
    };
  }, [syncUser]);

  useEffect(() => {
    if (!tutorialReplayPending || !user?.username || pathname !== "/") return;
    setTutorialReplayPending(false);
    setTutorialActive(true);
    setTutorialStep(0);
  }, [tutorialReplayPending, pathname, user?.username]);

  useEffect(() => {
    void syncBrowserSessionFromCookies();
    void syncUser();
  }, [pathname, syncUser]);

  const hideNav = pathname === "/onboarding";
  const showTutorialOverlay =
    tutorialActive &&
    Boolean(user?.username) &&
    shouldShowTutorialOverlay(pathname, user!.username!, tutorialStep);

  return (
    <NavigationPendingProvider>
      <StashProvider isAuthenticated={Boolean(user)} authReady={authReady}>
        <div className="flex min-h-screen flex-col">
          {hideNav ? null : <Navbar user={user} />}
          <MainContent>{children}</MainContent>
          {hideNav ? null : <MobileTabBar user={user} />}
          {showTutorialOverlay && user?.username ? (
            <AppTutorialGate
              key={tutorialKey}
              username={user.username}
              initialStep={tutorialStep}
              onStepChange={setTutorialStep}
              onComplete={() => setTutorialActive(false)}
            />
          ) : null}
        </div>
      </StashProvider>
    </NavigationPendingProvider>
  );
}
