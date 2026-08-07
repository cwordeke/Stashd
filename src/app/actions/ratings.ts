"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { isMediaType, mediaDetailPath, type MediaType } from "@/lib/types";

export type RatingActionResult =
  | { ok: true; rating: number; message: string }
  | { ok: false; message: string };

function clampRating(rating: number): number | null {
  if (!Number.isFinite(rating)) return null;
  const stepped = Math.round(rating * 2) / 2;
  if (stepped < 0.5 || stepped > 5) return null;
  return stepped;
}

export async function getUserRating(
  mediaId: string,
  mediaType: MediaType
): Promise<number | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("user_ratings")
    .select("rating")
    .eq("user_id", user.id)
    .eq("media_id", mediaId)
    .eq("media_type", mediaType)
    .maybeSingle();

  if (error || data?.rating == null) return null;
  return Number(data.rating);
}

export async function rateMedia(
  mediaId: string,
  mediaType: string,
  rating: number
): Promise<RatingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in to rate media" };
  }

  if (!isMediaType(mediaType)) {
    return { ok: false, message: "Invalid media type" };
  }

  const clamped = clampRating(rating);
  if (clamped == null) {
    return { ok: false, message: "Rating must be between 0.5 and 5" };
  }

  const { error } = await supabase.from("user_ratings").upsert(
    {
      user_id: user.id,
      media_id: mediaId,
      media_type: mediaType,
      rating: clamped,
    },
    { onConflict: "user_id,media_id,media_type" }
  );

  if (error) {
    // Fallback if unique constraint name differs: update-or-insert manually
    const { data: existing } = await supabase
      .from("user_ratings")
      .select("id")
      .eq("user_id", user.id)
      .eq("media_id", mediaId)
      .eq("media_type", mediaType)
      .maybeSingle();

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("user_ratings")
        .update({ rating: clamped })
        .eq("id", existing.id);

      if (updateError) {
        return { ok: false, message: updateError.message };
      }
    } else {
      const { error: insertError } = await supabase.from("user_ratings").insert({
        user_id: user.id,
        media_id: mediaId,
        media_type: mediaType,
        rating: clamped,
      });

      if (insertError) {
        return { ok: false, message: insertError.message || error.message };
      }
    }
  }

  revalidatePath(mediaDetailPath(mediaType, mediaId));

  return { ok: true, rating: clamped, message: "Rating saved" };
}

export async function clearMediaRating(
  mediaId: string,
  mediaType: string
): Promise<RatingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in to update ratings" };
  }

  if (!isMediaType(mediaType)) {
    return { ok: false, message: "Invalid media type" };
  }

  const { error } = await supabase
    .from("user_ratings")
    .delete()
    .eq("user_id", user.id)
    .eq("media_id", mediaId)
    .eq("media_type", mediaType);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(mediaDetailPath(mediaType, mediaId));

  return { ok: true, rating: 0, message: "Rating cleared" };
}
