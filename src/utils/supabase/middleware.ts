import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { profilePath } from "@/lib/auth";
import {
  claimsFromJwt,
  isOnboardingDone,
} from "@/lib/jwt-auth";
import { getMiddlewareMode } from "@/lib/route-policy";
import { getSupabaseEnv } from "@/utils/supabase/env";

const MIDDLEWARE_TIMING =
  process.env.MIDDLEWARE_TIMING === "1" || process.env.VERCEL === "1";

function redirectWithSession(url: URL, sessionResponse: NextResponse): NextResponse {
  const response = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach(({ name, value }) => {
    response.cookies.set(name, value);
  });
  return response;
}

function logMiddlewareTiming(
  pathname: string,
  mode: string,
  startedAt: number,
  detail?: string
): void {
  if (!MIDDLEWARE_TIMING) return;
  const elapsed = Date.now() - startedAt;
  console.info("[middleware] timing", {
    pathname,
    mode,
    elapsedMs: elapsed,
    detail,
  });
}

function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });
}

async function refreshSessionClaims(
  request: NextRequest,
  response: NextResponse
) {
  const supabase = createSupabaseMiddlewareClient(request, response);
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    console.error("[middleware] getClaims failed", { message: error.message });
  }

  return {
    claims: claimsFromJwt(data?.claims),
    response,
  };
}

export async function updateSession(request: NextRequest) {
  const startedAt = Date.now();
  const pathname = request.nextUrl.pathname;
  const mode = getMiddlewareMode(pathname);

  if (MIDDLEWARE_TIMING) {
    console.info("[middleware] start", { pathname, mode });
  }

  if (mode === "skip" || mode === "public") {
    logMiddlewareTiming(pathname, mode, startedAt, "bypass");
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const { claims, response } = await refreshSessionClaims(
    request,
    supabaseResponse
  );
  supabaseResponse = response;

  if (mode === "protected" && !claims.userId) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    logMiddlewareTiming(pathname, mode, startedAt, "redirect-login");
    return redirectWithSession(loginUrl, supabaseResponse);
  }

  if (mode === "auth-entry" && claims.userId) {
    const dest = request.nextUrl.clone();
    dest.pathname = isOnboardingDone(
      claims.username,
      claims.onboardingCompleted
    )
      ? profilePath(claims.username)
      : "/onboarding";
    dest.search = "";
    logMiddlewareTiming(pathname, mode, startedAt, "redirect-authenticated");
    return redirectWithSession(dest, supabaseResponse);
  }

  logMiddlewareTiming(pathname, mode, startedAt, "continue");
  return supabaseResponse;
}
