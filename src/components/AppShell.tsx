"use client";

import { useEffect, useState } from "react";
import { NavigationPendingProvider, useNavigationPending } from "@/context/NavigationPendingContext";
import { StashProvider } from "@/context/StashContext";
import Navbar from "@/components/Navbar";
import { PendingRouteView } from "@/components/PendingRouteView";
import { toAuthUserSummary, type AuthUserSummary } from "@/lib/auth";
import { createClient } from "@/utils/supabase/client";

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
    <main className="flex-1">
      {pendingHref ? <PendingRouteView /> : children}
    </main>
  );
}

export default function AppShell({ children }: AppShellProps) {
  const [user, setUser] = useState<AuthUserSummary | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function syncUser() {
      const {
        data: { user: nextUser },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!nextUser) {
        setUser(null);
        setAuthReady(true);
        return;
      }

      let username = usernameFromUser(nextUser);
      if (!username) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", nextUser.id)
          .maybeSingle();

        if (cancelled) return;

        username =
          typeof profile?.username === "string" ? profile.username : null;

        if (username) {
          void supabase.auth.updateUser({
            data: { username },
          });
        }
      }

      setUser(toAuthUserSummary(nextUser, username));
      setAuthReady(true);
    }

    void syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncUser();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <NavigationPendingProvider>
      <StashProvider isAuthenticated={Boolean(user)} authReady={authReady}>
        <div className="flex min-h-screen flex-col">
          <Navbar user={user} />
          <MainContent>{children}</MainContent>
        </div>
      </StashProvider>
    </NavigationPendingProvider>
  );
}
