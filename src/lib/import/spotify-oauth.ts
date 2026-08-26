import { createHmac, timingSafeEqual } from "crypto";

const STATE_TTL_MS = 10 * 60 * 1000;

function isLoopbackUrl(value: string): boolean {
  return /:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(value);
}

/** Spotify rejects `localhost`; loopback must be an explicit IP (RFC 8252). */
export function getSpotifyRedirectUri(origin: string): string {
  const configured = process.env.SPOTIFY_REDIRECT_URI?.trim();
  const fallback = `${origin}/api/spotify/callback`;
  // Don't ship a leftover local redirect URI to production.
  const raw =
    configured &&
    !(process.env.NODE_ENV === "production" && isLoopbackUrl(configured))
      ? configured
      : fallback;
  return raw.replace("://localhost", "://127.0.0.1");
}

function stateSecret(): string {
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!secret) throw new Error("Missing SPOTIFY_CLIENT_SECRET");
  return secret;
}

function hmac(payload: string): string {
  return createHmac("sha256", stateSecret()).update(payload).digest("base64url");
}

export function signSpotifyOAuthState(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      uid: userId,
      n: crypto.randomUUID(),
      exp: Date.now() + STATE_TTL_MS,
    })
  ).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export function verifySpotifyOAuthState(
  state: string,
  userId: string
): boolean {
  const dot = state.lastIndexOf(".");
  if (dot <= 0) return false;

  const payload = state.slice(0, dot);
  const signature = state.slice(dot + 1);
  const expected = hmac(payload);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { uid?: string; exp?: number };
    if (data.uid !== userId) return false;
    if (typeof data.exp !== "number" || data.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export async function exchangeSpotifyCode(
  code: string,
  redirectUri: string
): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Spotify token exchange failed: ${res.status} ${detail}`.trim()
    );
  }

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
  };
  if (!data.access_token) {
    throw new Error("Spotify token response missing access_token");
  }

  // One-shot import: keep the access token in memory only. Never persist refresh tokens.
  void data.refresh_token;
  return data.access_token;
}
