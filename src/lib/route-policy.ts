/**
 * Central route classification for middleware and server-side auth guards.
 * Keep this list in sync when adding new authenticated surfaces.
 */

const PROTECTED_EXACT = new Set(["/profile", "/settings", "/onboarding"]);

const PROTECTED_PREFIXES = ["/profile/", "/settings/"];

/** Routes where logged-in users should be sent away (e.g. to their profile). */
const AUTH_ENTRY_PREFIXES = ["/login"];

const PUBLIC_API_PREFIXES = ["/api/"];

const LIST_EDIT_PATTERN = /^\/u\/[^/]+\/lists\/[^/]+\/edit\/?$/;
const LIST_NEW_PATTERN = /^\/u\/[^/]+\/lists\/new\/?$/;

export type MiddlewareMode =
  | "skip"
  | "public"
  | "protected"
  | "auth-entry";

export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
}

export function isProtectedRoute(pathname: string): boolean {
  const path = normalizePathname(pathname);

  if (PROTECTED_EXACT.has(path)) return true;
  if (PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return true;
  }
  if (LIST_NEW_PATTERN.test(path) || LIST_EDIT_PATTERN.test(path)) {
    return true;
  }

  return false;
}

export function isAuthEntryRoute(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return AUTH_ENTRY_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

/** Routes whose middleware work should not be prefetched aggressively. */
export function isAuthSensitivePrefetchPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (isAuthEntryRoute(path)) return true;
  if (isProtectedRoute(path)) return true;
  return false;
}

export function shouldSkipMiddleware(pathname: string): boolean {
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  if (pathname.startsWith("/auth/callback")) {
    return true;
  }
  return false;
}

export function getMiddlewareMode(pathname: string): MiddlewareMode {
  if (shouldSkipMiddleware(pathname)) {
    return "skip";
  }
  if (isProtectedRoute(pathname)) {
    return "protected";
  }
  if (isAuthEntryRoute(pathname)) {
    return "auth-entry";
  }
  return "public";
}
