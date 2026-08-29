"use server";

import { createClient } from "@/utils/supabase/server";
import { safeClientMessage } from "@/lib/server-action-utils";
import { completedStatusFor } from "@/lib/media-status";
import {
  IMPORT_BATCH_MAX,
  type ImportBatchItem,
  type ImportItemResult,
  type ProcessImportBatchResult,
} from "@/lib/import/types";
import { searchTmdbMovie } from "@/lib/providers/tmdb";
import type { UnifiedMediaItem } from "@/lib/types";

const MOVIE_STATUS = completedStatusFor("movie");

type ExistingLog = {
  id: string;
  on_list: boolean | null;
  is_liked: boolean | null;
};

function clampRating(rating: number): number | null {
  if (!Number.isFinite(rating)) return null;
  const stepped = Math.round(rating * 2) / 2;
  if (stepped < 0.5 || stepped > 5) return null;
  return stepped;
}

function unmatchedMessage(title: string): string {
  return `Could not find a match for ${title}`;
}

async function upsertWatchedLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  item: UnifiedMediaItem,
  existing: ExistingLog | undefined
): Promise<{ ok: true } | { ok: false; message: string }> {
  const now = new Date().toISOString();
  const fields: Record<string, unknown> = {
    status: MOVIE_STATUS,
    on_list: Boolean(existing?.on_list),
    is_liked: Boolean(existing?.is_liked),
    updated_at: now,
    title: item.title,
    creator: item.creator,
    release_year: item.year,
    image_url: item.thumbnail,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("user_media_logs")
      .update(fields)
      .eq("id", existing.id);

    if (!error) return { ok: true };

    const { error: bareUpdate } = await supabase
      .from("user_media_logs")
      .update({
        status: MOVIE_STATUS,
        on_list: Boolean(existing.on_list),
        is_liked: Boolean(existing.is_liked),
        updated_at: now,
      })
      .eq("id", existing.id);

    if (bareUpdate) return { ok: false, message: bareUpdate.message };
    return { ok: true };
  }

  const { error: insertError } = await supabase.from("user_media_logs").insert({
    user_id: userId,
    media_id: item.id,
    media_type: "movie",
    ...fields,
  });

  if (!insertError) return { ok: true };

  const { error: bareInsert } = await supabase.from("user_media_logs").insert({
    user_id: userId,
    media_id: item.id,
    media_type: "movie",
    status: MOVIE_STATUS,
    on_list: false,
    is_liked: false,
    updated_at: now,
  });

  if (bareInsert) return { ok: false, message: bareInsert.message };
  return { ok: true };
}

async function upsertRating(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  item: UnifiedMediaItem,
  rating: number
): Promise<{ ok: true } | { ok: false; message: string }> {
  const clamped = clampRating(rating);
  if (clamped == null) return { ok: true };

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    user_id: userId,
    media_id: item.id,
    media_type: "movie",
    rating: clamped,
    updated_at: now,
    title: item.title,
    creator: item.creator,
    release_year: item.year,
    image_url: item.thumbnail,
  };

  const { error } = await supabase.from("user_ratings").upsert(payload, {
    onConflict: "user_id,media_id,media_type",
  });

  if (!error) return { ok: true };

  const { data: existing } = await supabase
    .from("user_ratings")
    .select("id")
    .eq("user_id", userId)
    .eq("media_id", item.id)
    .eq("media_type", "movie")
    .maybeSingle();

  const minimal = {
    rating: clamped,
    title: item.title,
    creator: item.creator,
    release_year: item.year,
    image_url: item.thumbnail,
  };

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("user_ratings")
      .update(minimal)
      .eq("id", existing.id);

    if (updateError) {
      const { error: ratingOnly } = await supabase
        .from("user_ratings")
        .update({ rating: clamped })
        .eq("id", existing.id);
      if (ratingOnly) return { ok: false, message: ratingOnly.message };
    }
    return { ok: true };
  }

  const { error: insertError } = await supabase.from("user_ratings").insert({
    user_id: userId,
    media_id: item.id,
    media_type: "movie",
    ...minimal,
  });

  if (insertError) {
    const { error: bareInsert } = await supabase.from("user_ratings").insert({
      user_id: userId,
      media_id: item.id,
      media_type: "movie",
      rating: clamped,
    });
    if (bareInsert) {
      return { ok: false, message: bareInsert.message || error.message };
    }
  }

  return { ok: true };
}

export async function processImportBatch(
  batch: ImportBatchItem[]
): Promise<ProcessImportBatchResult> {
  try {
    const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in to import your history" };
  }

  if (!Array.isArray(batch) || batch.length === 0) {
    return { ok: true, results: [] };
  }

  if (batch.length > IMPORT_BATCH_MAX) {
    return {
      ok: false,
      message: `Import batches must be ${IMPORT_BATCH_MAX} items or fewer`,
    };
  }

  if (!process.env.TMDB_API_KEY) {
    return {
      ok: false,
      message: "Movie matching is unavailable right now. Try again later.",
    };
  }

  const sanitized: ImportBatchItem[] = batch.map((item) => ({
    title: typeof item?.title === "string" ? item.title : "",
    year: typeof item?.year === "string" ? item.year : "",
    rating: typeof item?.rating === "number" ? item.rating : undefined,
  }));

  const matches = await Promise.all(
    sanitized.map(async (row) => {
      const title = row.title.trim();
      if (!title) {
        return { row, item: null as UnifiedMediaItem | null };
      }
      try {
        const item = await searchTmdbMovie(title, row.year);
        return { row, item };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Movie matching failed";
        return { row, item: null as UnifiedMediaItem | null, error: message };
      }
    })
  );

  const matchedIds = [
    ...new Set(
      matches
        .map((entry) => entry.item?.id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const existingByMediaId = new Map<string, ExistingLog>();

  if (matchedIds.length > 0) {
    const { data: existingLogs } = await supabase
      .from("user_media_logs")
      .select("id, media_id, on_list, is_liked")
      .eq("user_id", user.id)
      .eq("media_type", "movie")
      .in("media_id", matchedIds);

    for (const log of existingLogs ?? []) {
      existingByMediaId.set(String(log.media_id), {
        id: String(log.id),
        on_list: log.on_list ?? null,
        is_liked: log.is_liked ?? null,
      });
    }
  }

  const results: ImportItemResult[] = [];

  for (const entry of matches) {
    const title = entry.row.title.trim();
    const year = entry.row.year.trim();

    if ("error" in entry && entry.error) {
      results.push({
        ok: false,
        title,
        year,
        message: `${title}: ${entry.error}`,
      });
      continue;
    }

    if (!entry.item) {
      results.push({
        ok: false,
        title,
        year,
        message: unmatchedMessage(title || "Untitled"),
      });
      continue;
    }

    const logResult = await upsertWatchedLog(
      supabase,
      user.id,
      entry.item,
      existingByMediaId.get(entry.item.id)
    );

    if (!logResult.ok) {
      results.push({
        ok: false,
        title,
        year,
        message: `Could not save ${title}: ${logResult.message}`,
      });
      continue;
    }

    existingByMediaId.set(entry.item.id, {
      id: existingByMediaId.get(entry.item.id)?.id ?? "",
      on_list: existingByMediaId.get(entry.item.id)?.on_list ?? false,
      is_liked: existingByMediaId.get(entry.item.id)?.is_liked ?? false,
    });

    if (entry.row.rating != null) {
      const ratingResult = await upsertRating(
        supabase,
        user.id,
        entry.item,
        entry.row.rating
      );
      if (!ratingResult.ok) {
        results.push({
          ok: false,
          title,
          year,
          message: `Saved as watched, but could not save rating for ${title}: ${ratingResult.message}`,
        });
        continue;
      }
    }

    results.push({
      ok: true,
      title,
      year,
      mediaId: entry.item.id,
    });
  }

  return { ok: true, results };
  } catch (error) {
    console.error("[processImportBatch]", safeClientMessage(error));
    return { ok: false, message: "Import failed. Please try again." };
  }
}
