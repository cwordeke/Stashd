import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { claimsFromJwt, type ClaimsSummary } from "@/lib/jwt-auth";
import { getMiddlewareMode } from "@/lib/route-policy";
import { withTimeout } from "@/lib/with-timeout";
import { getSupabaseEnv } from "@/utils/supabase/env";

const MIDDLEWARE_TIMING =
  process.env.MIDDLEWARE_TIMING === "1" || process.env.VERCEL === "1";

/** Hard ceiling so middleware never waits on Supabase Auth for Vercel's 25s limit. */
const MIDDLEWARE_AUTH_TIMEOUT_MS = 2_500;

const ANONYMOUS_CLAIMS: ClaimsSummary = {
  userId: null,
  username: null,
  onboardingCompleted: null,
};

function redirectWithSession(url: URL, sessionResponse: NextResponse): NextResponse {
  const response = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach(({ name, value }) => {
    response.cookies.set(name, value);
  });
  return response;
}

function logMiddleware(
  step: string,
  pathname: string,
  mode: string,
  detail?: Record<string, string | number | boolean | null>
): void {
  if (!MIDDLEWARE_TIMING) return;
  console.info(`[middleware] ${step}`, { pathname, mode, ...detail });
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

async function readSessionClaims(
  request: NextRequest,
  response: NextResponse
): Promise<{ claims: ClaimsSummary; response: NextResponse }> {
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

  logMiddleware("start", pathname, mode);

  if (mode === "skip" || mode === "public" || mode === "auth-entry") {
    logMiddlewareTiming(pathname, mode, startedAt, "bypass");
    logMiddleware("return", pathname, mode, { detail: "bypass" });
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  logMiddleware("before-claims", pathname, mode);

  const authStartedAt = Date.now();
  const authResult = await withTimeout(
    readSessionClaims(request, supabaseResponse),
    MIDDLEWARE_AUTH_TIMEOUT_MS,
    null
  );
  const timedOut = authResult === null;

  const { claims, response } = authResult ?? {
    claims: ANONYMOUS_CLAIMS,
    response: supabaseResponse,
  };

  supabaseResponse = response;

  logMiddleware("after-claims", pathname, mode, {
    hasUserId: Boolean(claims.userId),
    timedOut,
    authMs: Date.now() - authStartedAt,
  });

  if (!claims.userId) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    logMiddlewareTiming(
      pathname,
      mode,
      startedAt,
      timedOut ? "redirect-login-timeout" : "redirect-login"
    );
    logMiddleware("return", pathname, mode, {
      detail: timedOut ? "redirect-login-timeout" : "redirect-login",
    });
    return redirectWithSession(loginUrl, supabaseResponse);
  }

  logMiddlewareTiming(pathname, mode, startedAt, "continue");
  logMiddleware("return", pathname, mode, { detail: "continue" });
  return supabaseResponse;
}
