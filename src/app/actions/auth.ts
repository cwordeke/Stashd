"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { normalizeUsername, validateUsername } from "@/lib/username";

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
  redirect("/profile");
}

export async function signUpWithEmail(
  formData: FormData
): Promise<AuthActionResult | void> {
  const email = formString(formData, "email").trim();
  const password = formString(formData, "password");
  const usernameRaw = formString(formData, "username");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const validationError = validateUsername(usernameRaw);
  if (validationError) {
    return { error: validationError };
  }

  const username = normalizeUsername(usernameRaw);
  const supabase = await createClient();

  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (taken) {
    return { error: "Username taken" };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
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

  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    username,
    avatar_url: null,
    bio: null,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: ownProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (ownProfile) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ username })
          .eq("id", user.id);

        if (updateError?.code === "23505") {
          return { error: "Username taken" };
        }
        if (updateError) {
          return { error: updateError.message };
        }
      } else {
        return { error: "Username taken" };
      }
    } else {
      return { error: insertError.message };
    }
  }

  await supabase.auth.updateUser({
    data: { username },
  });

  revalidatePath("/", "layout");
  revalidatePath("/profile");
  revalidatePath(`/u/${username}`);
  redirect("/profile");
}
