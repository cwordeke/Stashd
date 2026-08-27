"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NavigationPendingProvider, useNavigationPending } from "@/context/NavigationPendingContext";
import { StashProvider } from "@/context/StashContext";
import Navbar from "@/components/Navbar";
import MobileTabBar from "@/components/MobileTabBar";
import { PendingRouteView } from "@/components/PendingRouteView";
import { toAuthUserSummary, type AuthUserSummary } from "@/lib/auth";
import { parsePreferredCategories } from "@/lib/media-order";
import { PROFILE_UPDATED_EVENT } from "@/lib/profile-events";
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

  const syncUser = useCallback(async () => {
    const supabase = createClient();
    await syncBrowserSessionFromCookies();

    const {
      data: { user: nextUser },
    } = await supabase.auth.getUser();

    if (!nextUser) {
      setUser(null);
      setAuthReady(true);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url, preferred_categories")
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
          preferred_categories: preferred,
        },
      });
    }

    setUser(
      toAuthUserSummary(nextUser, username, preferred, profileAvatar)
    );
    setAuthReady(true);
  }, []);

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

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
    };
  }, [syncUser]);

  // Email sign-in/up sets cookies via a server action, then client-navigates.
  // Re-read those cookies so the singleton client (and header) catch up.
  useEffect(() => {
    void syncBrowserSessionFromCookies();
    void syncUser();
  }, [pathname, syncUser]);

  const hideNav = pathname === "/onboarding";

  return (
    <NavigationPendingProvider>
      <StashProvider isAuthenticated={Boolean(user)} authReady={authReady}>
        <div className="flex min-h-screen flex-col">
          {hideNav ? null : <Navbar user={user} />}
          <MainContent>{children}</MainContent>
          {hideNav ? null : <MobileTabBar user={user} />}
        </div>
      </StashProvider>
    </NavigationPendingProvider>
  );
}
