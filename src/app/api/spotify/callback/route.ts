import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  exchangeSpotifyCode,
  getSpotifyRedirectUri,
  parseSpotifyOAuthState,
} from "@/lib/import/spotify-oauth";
import { importSpotifySavedAlbums } from "@/lib/import/spotify";
import { getRequestOrigin } from "@/lib/site-url";

function spotifyResultRedirect(
  origin: string,
  returnTo: string,
  params: { success?: string; error?: string }
) {
  const url = new URL(returnTo, origin);
  if (params.success) url.searchParams.set("success", params.success);
  if (params.error) url.searchParams.set("error", params.error);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { hostname, searchParams } = url;
  const origin = getRequestOrigin(request);
  let returnTo = "/settings";
  const fail = (reason: string) => {
    console.error("[spotify import]", reason);
    return spotifyResultRedirect(origin, returnTo, { error: "spotify_failed" });
  };

  if (searchParams.get("error")) {
    return fail(`Spotify returned error=${searchParams.get("error")}`);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return fail("Missing code or state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Spotify requires 127.0.0.1; the Stashd session cookie lives on localhost.
  if (!user && hostname === "127.0.0.1") {
    const bounce = new URL(request.url);
    bounce.hostname = "localhost";
    return NextResponse.redirect(bounce);
  }

  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent("/settings")}`
    );
  }

  const oauthState = parseSpotifyOAuthState(state, user.id);
  returnTo = oauthState.next;
  if (!oauthState.valid) {
    return fail("Invalid or expired OAuth state");
  }

  try {
    const accessToken = await exchangeSpotifyCode(
      code,
      getSpotifyRedirectUri(origin)
    );
    await importSpotifySavedAlbums(supabase, user.id, accessToken);
    revalidatePath("/");
    revalidatePath("/onboarding");
    revalidatePath("/settings");
    revalidatePath("/media", "layout");
  } catch (error) {
    console.error("[spotify import]", error);
    return fail(error instanceof Error ? error.message : "Import failed");
  }

  return spotifyResultRedirect(origin, returnTo, { success: "spotify" });
}
