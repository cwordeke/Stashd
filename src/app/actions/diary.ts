"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { completedStatusFor } from "@/lib/media-status";
import {
  isMediaType,
  mediaDetailPath,
  type MediaType,
} from "@/lib/types";

export type LogMediaResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export interface LogMediaInput {
  mediaId: string;
  mediaType: string;
  title: string;
  creator: string;
  year: string;
  thumbnail: string | null;
  loggedOn: string;
  rating: number | null;
  liked: boolean;
  isRewatch: boolean;
  review: string;
}

function clampRating(rating: number): number | null {
  if (!Number.isFinite(rating)) return null;
  const stepped = Math.round(rating * 2) / 2;
  if (stepped < 0.5 || stepped > 5) return null;
  return stepped;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime());
}

/** PostgREST: "Could not find the 'foo' column of 'diary_entries' in the schema cache" */
function missingColumnFromError(message: string): string | null {
  const match = message.match(
    /Could not find the '([^']+)' column/i
  );
  return match?.[1] ?? null;
}

async function insertDiaryEntry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: Record<string, unknown>
): Promise<{ error: { message: string } | null }> {
  let current: Record<string, unknown> = { ...payload };

  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await supabase.from("diary_entries").insert(current);
    if (!error) return { error: null };

    const missing = missingColumnFromError(error.message);
    if (!missing || !(missing in current)) {
      console.error("[logMedia] diary insert failed:", error.message, current);
      return { error: { message: error.message } };
    }

    console.warn(
      `[logMedia] dropping unknown diary column "${missing}" and retrying`
    );
    if (missing === "is_rewatch") {
      console.warn(
        "[logMedia] Run in Supabase SQL editor:\n" +
          "ALTER TABLE public.diary_entries ADD COLUMN IF NOT EXISTS is_rewatch BOOLEAN DEFAULT FALSE;\n" +
          "NOTIFY pgrst, 'reload schema';"
      );
    }
    const { [missing]: _removed, ...rest } = current;
    void _removed;
    current = rest;
  }

  return { error: { message: "Could not insert diary entry" } };
}

/** True if the current user already has at least one diary entry for this media. */
export async function hasUserLoggedMedia(
  mediaId: string,
  mediaType: string
): Promise<boolean> {
  if (!isMediaType(mediaType)) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { count, error } = await supabase
    .from("diary_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("media_id", mediaId)
    .eq("media_type", mediaType);

  if (error) {
    console.error("[hasUserLoggedMedia]", error.message);
    return false;
  }

  return (count ?? 0) > 0;
}

export async function logMedia(input: LogMediaInput): Promise<LogMediaResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in to log media" };
  }

  if (!isMediaType(input.mediaType)) {
    return { ok: false, message: "Invalid media type" };
  }

  const mediaType = input.mediaType as MediaType;
  const mediaId = input.mediaId.trim();
  if (!mediaId) {
    return { ok: false, message: "Missing media id" };
  }

  if (!isValidDate(input.loggedOn)) {
    return { ok: false, message: "Pick a valid date" };
  }

  const rating =
    input.rating == null ? null : clampRating(input.rating);
  if (input.rating != null && rating == null) {
    return { ok: false, message: "Rating must be between 0.5 and 5" };
  }

  const title = input.title.trim() || "Untitled";
  const creator = input.creator.trim() || "—";
  const year = input.year.trim() || "—";
  const reviewText = input.review.trim() || null;
  const now = new Date().toISOString();

  // Match the live table: no `creator` (often missing / stale in schema cache).
  // Optional fields like is_rewatch are stripped automatically if unknown.
  const diaryPayload: Record<string, unknown> = {
    user_id: user.id,
    media_id: mediaId,
    media_type: mediaType,
    title,
    image_url: input.thumbnail,
    release_year: year,
    rating,
    is_liked: Boolean(input.liked),
    is_rewatch: Boolean(input.isRewatch),
    watched_on: input.loggedOn,
    review_text: reviewText,
  };

  const ratingPayload = rating == null
    ? null
    : {
        user_id: user.id,
        media_id: mediaId,
        media_type: mediaType,
        rating,
        title,
        creator,
        image_url: input.thumbnail,
        release_year: year,
        updated_at: now,
      };

  // Preserve existing on_list when upserting the media log
  const { data: existingLog } = await supabase
    .from("user_media_logs")
    .select("id, on_list")
    .eq("user_id", user.id)
    .eq("media_id", mediaId)
    .eq("media_type", mediaType)
    .maybeSingle();

  const logPayload = {
    user_id: user.id,
    media_id: mediaId,
    media_type: mediaType,
    status: completedStatusFor(mediaType),
    on_list: Boolean(existingLog?.on_list),
    is_liked: Boolean(input.liked),
    title,
    creator,
    image_url: input.thumbnail,
    release_year: year,
    updated_at: now,
  };

  const diaryRes = await insertDiaryEntry(supabase, diaryPayload);

  if (diaryRes.error) {
    return { ok: false, message: diaryRes.error.message };
  }

  if (ratingPayload) {
    const ratingRes = await supabase.from("user_ratings").upsert(ratingPayload, {
      onConflict: "user_id,media_id,media_type",
    });

    if (ratingRes.error) {
      await supabase.from("user_ratings").upsert(
        {
          user_id: user.id,
          media_id: mediaId,
          media_type: mediaType,
          rating: ratingPayload.rating,
        },
        { onConflict: "user_id,media_id,media_type" }
      );
    }
  }

  const logRes = await supabase.from("user_media_logs").upsert(logPayload, {
    onConflict: "user_id,media_id,media_type",
  });

  if (logRes.error) {
    await supabase.from("user_media_logs").upsert(
      {
        user_id: user.id,
        media_id: mediaId,
        media_type: mediaType,
        status: completedStatusFor(mediaType),
        on_list: Boolean(existingLog?.on_list),
        is_liked: Boolean(input.liked),
        updated_at: now,
      },
      { onConflict: "user_id,media_id,media_type" }
    );
  }

  revalidatePath(mediaDetailPath(mediaType, mediaId));
  revalidatePath("/profile");
  revalidatePath("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.username) {
    revalidatePath(`/u/${profile.username}`);
  }

  return { ok: true, message: "Logged successfully!" };
}
