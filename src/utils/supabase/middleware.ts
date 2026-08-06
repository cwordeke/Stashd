import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function metaUsername(user: {
  user_metadata?: Record<string, unknown>;
}): string | null {
  const meta = user.user_metadata ?? {};
  return typeof meta.username === "string" && meta.username
    ? meta.username
    : null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

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
    pathname.startsWith("/profile/");

  if (!user && pathname.startsWith("/onboarding")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", "/onboarding");
    return NextResponse.redirect(loginUrl);
  }

  if (!user && (pathname === "/profile" || pathname.startsWith("/profile/"))) {
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
  if (!username || isGateRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    username =
      typeof profile?.username === "string" ? profile.username : null;
  }

  if (!username && !isAuthRoute) {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    onboardingUrl.search = "";
    return NextResponse.redirect(onboardingUrl);
  }

  if (username && pathname === "/onboarding") {
    const publicUrl = request.nextUrl.clone();
    publicUrl.pathname = `/u/${username}`;
    publicUrl.search = "";
    return NextResponse.redirect(publicUrl);
  }

  if (username && (pathname === "/login" || pathname === "/profile")) {
    const publicUrl = request.nextUrl.clone();
    publicUrl.pathname = `/u/${username}`;
    publicUrl.search = "";
    return NextResponse.redirect(publicUrl);
  }

  if (!username && pathname === "/login") {
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    onboardingUrl.search = "";
    return NextResponse.redirect(onboardingUrl);
  }

  return supabaseResponse;
}
