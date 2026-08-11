"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  RATING_STEPS,
  type RatingActionResult,
  type UserRatingStats,
} from "@/lib/ratings";
import { isMediaType, mediaDetailPath, type MediaType } from "@/lib/types";

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
  rating: number,
  meta?: {
    title?: string;
    creator?: string;
    year?: string;
    thumbnail?: string | null;
  }
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

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    user_id: user.id,
    media_id: mediaId,
    media_type: mediaType,
    rating: clamped,
    updated_at: now,
  };

  if (meta?.title) payload.title = meta.title;
  if (meta?.creator) payload.creator = meta.creator;
  if (meta?.year) payload.release_year = meta.year;
  if (meta?.thumbnail !== undefined) payload.image_url = meta.thumbnail;

  const { error } = await supabase.from("user_ratings").upsert(payload, {
    onConflict: "user_id,media_id,media_type",
  });

  if (error) {
    // Fallback if unique constraint / metadata columns differ
    const { data: existing } = await supabase
      .from("user_ratings")
      .select("id")
      .eq("user_id", user.id)
      .eq("media_id", mediaId)
      .eq("media_type", mediaType)
      .maybeSingle();

    const minimal = {
      rating: clamped,
      ...(meta?.title ? { title: meta.title } : {}),
      ...(meta?.creator ? { creator: meta.creator } : {}),
      ...(meta?.year ? { release_year: meta.year } : {}),
      ...(meta?.thumbnail !== undefined ? { image_url: meta.thumbnail } : {}),
    };

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("user_ratings")
        .update(minimal)
        .eq("id", existing.id);

      if (updateError) {
        // Last resort: rating only
        const { error: ratingOnly } = await supabase
          .from("user_ratings")
          .update({ rating: clamped })
          .eq("id", existing.id);
        if (ratingOnly) {
          return { ok: false, message: ratingOnly.message };
        }
      }
    } else {
      const { error: insertError } = await supabase.from("user_ratings").insert({
        user_id: user.id,
        media_id: mediaId,
        media_type: mediaType,
        ...minimal,
      });

      if (insertError) {
        const { error: bareInsert } = await supabase.from("user_ratings").insert({
          user_id: user.id,
          media_id: mediaId,
          media_type: mediaType,
          rating: clamped,
        });
        if (bareInsert) {
          return { ok: false, message: bareInsert.message || error.message };
        }
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

function emptyRatingStats(): UserRatingStats {
  return {
    totalRatings: 0,
    averageRating: 0,
    distribution: RATING_STEPS.map((score) => ({ score, count: 0 })),
  };
}

/** Aggregate average + histogram counts for a user's ratings (0.5–5). */
export async function getUserRatingStats(
  userId: string
): Promise<UserRatingStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_ratings")
    .select("rating")
    .eq("user_id", userId);

  if (error || !data?.length) {
    if (error) console.error("[getUserRatingStats]", error.message);
    return emptyRatingStats();
  }

  const counts = new Map<number, number>(
    RATING_STEPS.map((score) => [score, 0])
  );
  let sum = 0;
  let total = 0;

  for (const row of data) {
    const raw = Number(row.rating);
    if (!Number.isFinite(raw)) continue;
    const stepped = Math.round(raw * 2) / 2;
    if (stepped < 0.5 || stepped > 5) continue;

    sum += stepped;
    total += 1;
    counts.set(stepped, (counts.get(stepped) ?? 0) + 1);
  }

  if (total === 0) return emptyRatingStats();

  return {
    totalRatings: total,
    averageRating: Math.round((sum / total) * 100) / 100,
    distribution: RATING_STEPS.map((score) => ({
      score,
      count: counts.get(score) ?? 0,
    })),
  };
}
