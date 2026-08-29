"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function saveTutorialStep(step: number): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false };

  await supabase
    .from("profiles")
    .update({ tutorial_step: step })
    .eq("id", user.id);

  await supabase.auth.updateUser({
    data: { tutorial_step: step },
  });

  return { ok: true };
}

export async function completeTutorial(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false };

  await supabase
    .from("profiles")
    .update({ tutorial_completed: true, tutorial_step: 0 })
    .eq("id", user.id);

  await supabase.auth.updateUser({
    data: { tutorial_completed: true, tutorial_step: 0 },
  });

  await supabase.auth.refreshSession();
  revalidatePath("/", "layout");

  return { ok: true };
}

export async function resetTutorial(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false };

  await supabase
    .from("profiles")
    .update({ tutorial_completed: false, tutorial_step: 0 })
    .eq("id", user.id);

  await supabase.auth.updateUser({
    data: { tutorial_completed: false, tutorial_step: 0 },
  });

  await supabase.auth.refreshSession();
  revalidatePath("/", "layout");

  return { ok: true };
}
