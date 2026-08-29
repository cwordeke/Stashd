import { metaTutorialCompleted } from "@/lib/jwt-auth";
import { createClient } from "@/utils/supabase/server";

/** `true` when the home tutorial has been completed or dismissed. */
export async function isTutorialDone(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return true;

  const fromJwt = metaTutorialCompleted(user);
  if (fromJwt !== null) return fromJwt;

  const { data, error } = await supabase
    .from("profiles")
    .select("tutorial_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!error && typeof data?.tutorial_completed === "boolean") {
    return data.tutorial_completed;
  }

  return true;
}
