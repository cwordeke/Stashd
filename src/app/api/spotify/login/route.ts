import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  getSpotifyRedirectUri,
  signSpotifyOAuthState,
} from "@/lib/import/spotify-oauth";
import { getRequestOrigin } from "@/lib/site-url";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const origin = getRequestOrigin(request);

  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent("/api/spotify/login")}`
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${origin}/settings?error=spotify_failed`);
  }

  const authorize = new URL("https://accounts.spotify.com/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("redirect_uri", getSpotifyRedirectUri(origin));
  authorize.searchParams.set("scope", "user-library-read");
  authorize.searchParams.set("state", signSpotifyOAuthState(user.id));

  return NextResponse.redirect(authorize.toString());
}
