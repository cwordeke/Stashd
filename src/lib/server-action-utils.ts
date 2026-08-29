import { createClient } from "@/utils/supabase/server";
import type { User } from "@supabase/supabase-js";

type AuthResult =
  | { ok: true; user: User }
  | { ok: false; message: string };

/** Require an authenticated Supabase session before running a mutation. */
export async function requireAuthUser(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in required" };
  }

  return { ok: true, user };
}

/** Map unexpected errors to a safe client-facing message (no raw DB strings). */
export function safeClientMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (process.env.NODE_ENV === "development" && error instanceof Error) {
    return error.message;
  }
  return fallback;
}
