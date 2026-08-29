"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { safeClientMessage } from "@/lib/server-action-utils";

export async function saveTutorialStep(step: number): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false };

    const { error } = await supabase
      .from("profiles")
      .update({ tutorial_step: step })
      .eq("id", user.id);

    if (error) {
      console.error("[saveTutorialStep]", error.message);
      return { ok: false };
    }

    await supabase.auth.updateUser({
      data: { tutorial_step: step },
    });

    return { ok: true };
  } catch (error) {
    console.error("[saveTutorialStep]", safeClientMessage(error));
    return { ok: false };
  }
}

export async function completeTutorial(): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false };

    const { error } = await supabase
      .from("profiles")
      .update({ tutorial_completed: true, tutorial_step: 0 })
      .eq("id", user.id);

    if (error) {
      console.error("[completeTutorial]", error.message);
      return { ok: false };
    }

    await supabase.auth.updateUser({
      data: { tutorial_completed: true, tutorial_step: 0 },
    });

    await supabase.auth.refreshSession();
    revalidatePath("/", "layout");

    return { ok: true };
  } catch (error) {
    console.error("[completeTutorial]", safeClientMessage(error));
    return { ok: false };
  }
}

export async function resetTutorial(): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { ok: false };

    const { error } = await supabase
      .from("profiles")
      .update({ tutorial_completed: false, tutorial_step: 0 })
      .eq("id", user.id);

    if (error) {
      console.error("[resetTutorial]", error.message);
      return { ok: false };
    }

    await supabase.auth.updateUser({
      data: { tutorial_completed: false, tutorial_step: 0 },
    });

    await supabase.auth.refreshSession();
    revalidatePath("/", "layout");

    return { ok: true };
  } catch (error) {
    console.error("[resetTutorial]", safeClientMessage(error));
    return { ok: false };
  }
}
