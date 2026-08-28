import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  claimsFromJwt,
  isOnboardingDone,
  PROFILE_LOOKUP_TIMEOUT_MS,
} from "@/lib/jwt-auth";
import { getSupabaseEnv } from "@/utils/supabase/env";

function redirectWithSession(url: URL, sessionResponse: NextResponse): NextResponse {
  const response = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach(({ name, value }) => {
    response.cookies.set(name, value);
  });
  return response;
}

async function fetchProfileFallback(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<{ username: string | null; onboardingCompleted: boolean | null }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, onboarding_completed")
      .eq("id", userId)
      .abortSignal(AbortSignal.timeout(PROFILE_LOOKUP_TIMEOUT_MS))
      .maybeSingle();

    if (error) {
      console.error("[middleware] profile fallback failed", { code: error.code });
      return { username: null, onboardingCompleted: null };
    }

    const username =
      typeof data?.username === "string" && data.username ? data.username : null;
    const onboardingCompleted =
      data &&
      "onboarding_completed" in data &&
      typeof data.onboarding_completed === "boolean"
        ? data.onboarding_completed
        : null;

    return { username, onboardingCompleted };
  } catch {
    console.error("[middleware] profile fallback timed out");
    return { username: null, onboardingCompleted: null };
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Do not run code between createServerClient and getClaims().
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError) {
    console.error("[middleware] getClaims failed", { message: claimsError.message });
  }

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding");

  const { userId, username: jwtUsername, onboardingCompleted: jwtOnboarding } =
    claimsFromJwt(claimsData?.claims);

  if (!userId && pathname.startsWith("/onboarding")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", "/onboarding");
    return redirectWithSession(loginUrl, supabaseResponse);
  }

  if (
    !userId &&
    (pathname === "/profile" ||
      pathname.startsWith("/profile/") ||
      pathname === "/settings" ||
      pathname.startsWith("/settings/"))
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return redirectWithSession(loginUrl, supabaseResponse);
  }

  if (!userId) {
    return supabaseResponse;
  }

  let username = jwtUsername;
  let onboardingCompleted = jwtOnboarding;

  // Rare legacy fallback: JWT missing username but profile row may exist.
  if (!username) {
    const profile = await fetchProfileFallback(supabase, userId);
    if (profile.username) {
      username = profile.username;
    }
    if (profile.onboardingCompleted !== null) {
      onboardingCompleted = profile.onboardingCompleted;
    }
  }

  const onboardingDone = isOnboardingDone(username, onboardingCompleted);

  if (!username && !isAuthRoute) {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    onboardingUrl.search = "";
    return redirectWithSession(onboardingUrl, supabaseResponse);
  }

  if (username && !onboardingDone && !isAuthRoute) {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    onboardingUrl.search = "";
    return redirectWithSession(onboardingUrl, supabaseResponse);
  }

  if (username && onboardingDone && pathname === "/onboarding") {
    const publicUrl = request.nextUrl.clone();
    publicUrl.pathname = `/u/${username}`;
    publicUrl.search = "";
    return redirectWithSession(publicUrl, supabaseResponse);
  }

  if (username && (pathname === "/login" || pathname === "/profile")) {
    const dest = request.nextUrl.clone();
    dest.pathname = onboardingDone ? `/u/${username}` : "/onboarding";
    dest.search = "";
    return redirectWithSession(dest, supabaseResponse);
  }

  if (!username && pathname === "/login") {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    onboardingUrl.search = "";
    return redirectWithSession(onboardingUrl, supabaseResponse);
  }

  return supabaseResponse;
}
