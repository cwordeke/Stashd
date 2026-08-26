import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/utils/supabase/env";

function metaUsername(user: {
  user_metadata?: Record<string, unknown>;
}): string | null {
  const meta = user.user_metadata ?? {};
  return typeof meta.username === "string" && meta.username
    ? meta.username
    : null;
}

function metaOnboardingCompleted(user: {
  user_metadata?: Record<string, unknown>;
}): boolean | null {
  const value = user.user_metadata?.onboarding_completed;
  if (value === true) return true;
  if (value === false) return false;
  return null;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding");
  const isGateRoute =
    pathname === "/login" ||
    pathname === "/onboarding" ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/");

  if (!user && pathname.startsWith("/onboarding")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", "/onboarding");
    return NextResponse.redirect(loginUrl);
  }

  if (
    !user &&
    (pathname === "/profile" ||
      pathname.startsWith("/profile/") ||
      pathname === "/settings" ||
      pathname.startsWith("/settings/"))
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!user) {
    return supabaseResponse;
  }

  // Prefer JWT metadata so media-page navigations skip a profiles round-trip.
  let username = metaUsername(user);
  let onboardingCompleted = metaOnboardingCompleted(user);

  if (!username || isGateRoute || onboardingCompleted === false) {
    const withFlag = await supabase
      .from("profiles")
      .select("username, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    const profile = withFlag.error
      ? (
          await supabase
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .maybeSingle()
        ).data
      : withFlag.data;

    if (typeof profile?.username === "string") {
      username = profile.username;
    }
    if (
      profile &&
      "onboarding_completed" in profile &&
      typeof profile.onboarding_completed === "boolean"
    ) {
      onboardingCompleted = profile.onboarding_completed;
    }
  }

  // Legacy accounts: username exists, flag never set on the JWT → already done.
  const onboardingDone =
    onboardingCompleted === true ||
    (onboardingCompleted !== false && Boolean(username));

  if (!username && !isAuthRoute) {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    onboardingUrl.search = "";
    return NextResponse.redirect(onboardingUrl);
  }

  if (username && !onboardingDone && !isAuthRoute) {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    onboardingUrl.search = "";
    return NextResponse.redirect(onboardingUrl);
  }

  if (username && onboardingDone && pathname === "/onboarding") {
    const publicUrl = request.nextUrl.clone();
    publicUrl.pathname = `/u/${username}`;
    publicUrl.search = "";
    return NextResponse.redirect(publicUrl);
  }

  if (username && (pathname === "/login" || pathname === "/profile")) {
    const dest = request.nextUrl.clone();
    dest.pathname = onboardingDone ? `/u/${username}` : "/onboarding";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  if (!username && pathname === "/login") {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    onboardingUrl.search = "";
    return NextResponse.redirect(onboardingUrl);
  }

  return supabaseResponse;
}
