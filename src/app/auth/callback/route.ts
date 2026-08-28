import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { syncAuthMetadataFromProfile } from "@/lib/sync-auth-metadata";
import {
  DEFAULT_AUTH_NEXT,
  getRequestOrigin,
  safeRelativePath,
} from "@/lib/site-url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin(request);
  const code = searchParams.get("code");
  const next = safeRelativePath(searchParams.get("next"), DEFAULT_AUTH_NEXT);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      await syncAuthMetadataFromProfile(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
