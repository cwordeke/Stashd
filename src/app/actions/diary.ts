"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { safeClientMessage } from "@/lib/server-action-utils";
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

function extractReviewText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRating(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

interface ProfileEmbed {
  username: string;
  avatar_url: string | null;
}

function embedProfile(value: unknown): ProfileEmbed | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const rec = row as Record<string, unknown>;
  if (typeof rec.username !== "string" || !rec.username) return null;
  return {
    username: rec.username,
    avatar_url: typeof rec.avatar_url === "string" ? rec.avatar_url : null,
  };
}

export interface MediaReview {
  id: string;
  reviewText: string;
  rating: number | null;
  loggedOn: string;
  username: string;
  avatarUrl: string | null;
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
    if (missing === "review_text") {
      console.warn(
        "[logMedia] Run in Supabase SQL editor:\n" +
          "ALTER TABLE public.diary_entries ADD COLUMN IF NOT EXISTS review_text TEXT;\n" +
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
  try {
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
  const reviewText = extractReviewText(input.review);
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
    console.error("[logMedia]", diaryRes.error.message);
    return { ok: false, message: "Could not save your log. Please try again." };
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
  } catch (error) {
    console.error("[logMedia]", safeClientMessage(error));
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

const RECENT_REVIEWS_LIMIT = 20;

/** Most recent written reviews for a media title, with reviewer profile. */
export async function getRecentReviewsForMedia(
  mediaId: string,
  mediaType: string,
  limit = RECENT_REVIEWS_LIMIT
): Promise<MediaReview[]> {
  if (!isMediaType(mediaType) || !mediaId.trim()) return [];

  const supabase = await createClient();
  const capped = Math.min(Math.max(limit, 1), 50);

  const withProfiles = await supabase
    .from("diary_entries")
    .select(
      `
      id,
      user_id,
      rating,
      review_text,
      watched_on,
      created_at,
      profile:profiles!user_id (
        username,
        avatar_url
      )
    `
    )
    .eq("media_id", mediaId)
    .eq("media_type", mediaType)
    .not("review_text", "is", null)
    .neq("review_text", "")
    .order("watched_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(capped);

  let rows: Record<string, unknown>[] = [];

  if (withProfiles.error) {
    const fallback = await supabase
      .from("diary_entries")
      .select("id, user_id, rating, review_text, watched_on, created_at")
      .eq("media_id", mediaId)
      .eq("media_type", mediaType)
      .not("review_text", "is", null)
      .neq("review_text", "")
      .order("watched_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(capped);

    if (fallback.error || !fallback.data) {
      console.error(
        "[getRecentReviewsForMedia]",
        fallback.error?.message ?? withProfiles.error.message
      );
      return [];
    }

    rows = fallback.data as unknown as Record<string, unknown>[];

    const userIds = [
      ...new Set(
        rows
          .map((row) => (typeof row.user_id === "string" ? row.user_id : null))
          .filter((id): id is string => Boolean(id))
      ),
    ];

    if (userIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      const byId = new Map(
        (profiles ?? []).map((profile) => [
          profile.id as string,
          {
            username: profile.username as string,
            avatar_url: (profile.avatar_url as string | null) ?? null,
          },
        ])
      );

      rows = rows.map((row) => {
        const userId = typeof row.user_id === "string" ? row.user_id : "";
        return { ...row, profile: byId.get(userId) ?? null };
      });
    }
  } else {
    rows = (withProfiles.data ?? []) as unknown as Record<string, unknown>[];
  }

  const reviews: MediaReview[] = [];

  for (const rec of rows) {
    const reviewText = extractReviewText(rec.review_text);
    if (!reviewText) continue;

    const profile = embedProfile(rec.profile);
    if (!profile) continue;

    const id = typeof rec.id === "string" ? rec.id : "";
    if (!id) continue;

    const loggedOn =
      (typeof rec.watched_on === "string" && rec.watched_on) ||
      (typeof rec.created_at === "string" && rec.created_at) ||
      "";

    reviews.push({
      id,
      reviewText,
      rating: asRating(rec.rating),
      loggedOn,
      username: profile.username,
      avatarUrl: profile.avatar_url,
    });
  }

  return reviews;
}
