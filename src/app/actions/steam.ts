"use server";

import { createClient } from "@/utils/supabase/server";
import {
  importSteamLibraryForUser,
  type ImportSteamLibraryResult,
} from "@/lib/import/steam";

export async function importSteamLibrary(
  userInput: string
): Promise<ImportSteamLibraryResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in to import your Steam library" };
  }

  const trimmed = userInput.trim();
  if (!trimmed) {
    return { ok: false, message: "Enter your Steam ID or custom profile URL" };
  }

  try {
    return await importSteamLibraryForUser(supabase, user.id, trimmed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Steam import failed";
    return { ok: false, message };
  }
}
