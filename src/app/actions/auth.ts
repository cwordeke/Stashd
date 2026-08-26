"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  DEFAULT_AUTH_NEXT,
  getSiteUrl,
  safeRelativePath,
} from "@/lib/site-url";

export type AuthActionResult = { error: string };

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function signInWithEmail(
  formData: FormData
): Promise<AuthActionResult | void> {
  const email = formString(formData, "email").trim();
  const password = formString(formData, "password");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid credentials" };
  }

  revalidatePath("/", "layout");
  redirect(safeRelativePath(formString(formData, "next"), DEFAULT_AUTH_NEXT));
}

export async function signUpWithEmail(
  formData: FormData
): Promise<AuthActionResult | void> {
  const email = formString(formData, "email").trim();
  const password = formString(formData, "password");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await currentOrigin()}/auth/callback`,
      data: { onboarding_completed: false },
    },
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("already registered") ||
      message.includes("already exists")
    ) {
      return { error: "An account with this email already exists" };
    }
    return { error: error.message };
  }

  const user = data.user;
  if (!user) {
    return { error: "Could not create account. Please try again." };
  }

  if (user.identities && user.identities.length === 0) {
    return { error: "An account with this email already exists" };
  }

  await supabase.auth.updateUser({
    data: { onboarding_completed: false },
  });

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

async function currentOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");
  if (host) {
    return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;
  }
  return getSiteUrl();
}

