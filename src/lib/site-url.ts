/** Default post-auth landing path. */
export const DEFAULT_AUTH_NEXT = "/profile";

/**
 * Public site URL for metadata and absolute links.
 * Set `NEXT_PUBLIC_SITE_URL` on Vercel once you have a domain.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Origin of the current request. Uses forwarded headers on Vercel so
 * redirects stay on the public host instead of an internal one.
 */
export function getRequestOrigin(request: Request): string {
  if (process.env.NODE_ENV !== "development") {
    const host =
      firstHeader(request.headers.get("x-forwarded-host")) ??
      firstHeader(request.headers.get("host"));
    const proto = firstHeader(request.headers.get("x-forwarded-proto")) ?? "https";
    if (host) return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

/** Reject open redirects: only same-origin relative paths. */
export function safeRelativePath(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_NEXT
): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://") || trimmed.includes("\\")) return fallback;
  return trimmed;
}

function firstHeader(value: string | null): string | undefined {
  const part = value?.split(",")[0]?.trim();
  return part || undefined;
}
