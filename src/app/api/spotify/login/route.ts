import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  getSpotifyRedirectUri,
  sanitizeSpotifyReturnPath,
  signSpotifyOAuthState,
} from "@/lib/import/spotify-oauth";
import { getRequestOrigin } from "@/lib/site-url";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = sanitizeSpotifyReturnPath(url.searchParams.get("next"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const origin = getRequestOrigin(request);

  if (!user) {
    const loginNext = `/api/spotify/login?next=${encodeURIComponent(returnTo)}`;
    return NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent(loginNext)}`
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${origin}${returnTo}?error=spotify_failed`);
  }

  const authorize = new URL("https://accounts.spotify.com/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("redirect_uri", getSpotifyRedirectUri(origin));
  authorize.searchParams.set("scope", "user-library-read");
  authorize.searchParams.set("state", signSpotifyOAuthState(user.id, returnTo));

  return NextResponse.redirect(authorize.toString());
}
