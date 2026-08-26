import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  exchangeSpotifyCode,
  getSpotifyRedirectUri,
  verifySpotifyOAuthState,
} from "@/lib/import/spotify-oauth";
import { importSpotifySavedAlbums } from "@/lib/import/spotify";
import { getRequestOrigin } from "@/lib/site-url";

function settingsRedirect(
  origin: string,
  params: { success?: string; error?: string }
) {
  const url = new URL("/settings", origin);
  if (params.success) url.searchParams.set("success", params.success);
  if (params.error) url.searchParams.set("error", params.error);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { hostname, searchParams } = url;
  const origin = getRequestOrigin(request);
  const fail = (reason: string) => {
    console.error("[spotify import]", reason);
    return settingsRedirect(origin, { error: "spotify_failed" });
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

  if (!verifySpotifyOAuthState(state, user.id)) {
    return fail("Invalid or expired OAuth state");
  }

  try {
    const accessToken = await exchangeSpotifyCode(
      code,
      getSpotifyRedirectUri(origin)
    );
    await importSpotifySavedAlbums(supabase, user.id, accessToken);
    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath("/media", "layout");
  } catch (error) {
    console.error("[spotify import]", error);
    return fail(error instanceof Error ? error.message : "Import failed");
  }

  return settingsRedirect(origin, { success: "spotify" });
}
