import { createBrowserClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Server actions set auth cookies, but the browser client is a singleton that
 * keeps its initial (logged-out) session in memory. Re-read cookies and push
 * that session into the singleton so `onAuthStateChange` and the header update.
 */
export async function syncBrowserSessionFromCookies(): Promise<Session | null> {
  const singleton = createClient();
  const {
    data: { session: existing },
  } = await singleton.auth.getSession();
  if (existing) return existing;

  const fresh = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: false,
      auth: {
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: false,
      },
    }
  );
  const {
    data: { session },
  } = await fresh.auth.getSession();
  if (!session) return null;

  const { data, error } = await singleton.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) return null;
  return data.session;
}
