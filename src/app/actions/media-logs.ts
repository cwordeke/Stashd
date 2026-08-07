"use server";

import { createClient } from "@/utils/supabase/server";
import {
  EMPTY_MEDIA_LOG,
  completedStatusFor,
  isCompletedStatus,
  type MediaLogState,
} from "@/lib/media-status";
import { isMediaType, type MediaType } from "@/lib/types";

export type MediaLogActionResult =
  | { ok: true; state: MediaLogState; message: string }
  | { ok: false; message: string };

interface MediaLogRow {
  status: string | null;
  on_list: boolean | null;
  is_liked: boolean | null;
}

function rowToState(row: MediaLogRow | null | undefined): MediaLogState {
  if (!row) return { ...EMPTY_MEDIA_LOG };
  return {
    completed: isCompletedStatus(row.status),
    onList: Boolean(row.on_list),
    liked: Boolean(row.is_liked),
  };
}

function normalizeState(state: MediaLogState): MediaLogState {
  return {
    completed: Boolean(state.completed),
    onList: Boolean(state.onList),
    liked: Boolean(state.liked),
  };
}

export async function getUserMediaLog(
  mediaId: string,
  mediaType: MediaType
): Promise<MediaLogState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ...EMPTY_MEDIA_LOG };

  const { data, error } = await supabase
    .from("user_media_logs")
    .select("status, on_list, is_liked")
    .eq("user_id", user.id)
    .eq("media_id", mediaId)
    .eq("media_type", mediaType)
    .maybeSingle();

  if (error || !data) return { ...EMPTY_MEDIA_LOG };
  return rowToState(data as MediaLogRow);
}

/** Persist the full log snapshot (supports rapid multi-toggles without races). */
export async function setMediaLogState(
  mediaId: string,
  mediaType: string,
  state: MediaLogState
): Promise<MediaLogActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in to update your log" };
  }

  if (!isMediaType(mediaType)) {
    return { ok: false, message: "Invalid media type" };
  }

  const next = normalizeState(state);
  const nextStatus = next.completed ? completedStatusFor(mediaType) : null;
  const updatedAt = new Date().toISOString();

  const { data: existing, error: fetchError } = await supabase
    .from("user_media_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("media_id", mediaId)
    .eq("media_type", mediaType)
    .maybeSingle();

  if (fetchError) {
    return {
      ok: false,
      message: `${fetchError.message} — ensure column on_list exists (see supabase/user_media_logs.sql).`,
    };
  }

  if (!next.completed && !next.onList && !next.liked) {
    if (existing?.id) {
      const { error: deleteError } = await supabase
        .from("user_media_logs")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        return { ok: false, message: deleteError.message };
      }
    }

    return { ok: true, state: next, message: "Updated" };
  }

  const fields = {
    status: nextStatus,
    on_list: next.onList,
    is_liked: next.liked,
    updated_at: updatedAt,
  };

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("user_media_logs")
      .update(fields)
      .eq("id", existing.id);

    if (updateError) {
      return {
        ok: false,
        message: `${updateError.message} — ensure column on_list exists (see supabase/user_media_logs.sql).`,
      };
    }
  } else {
    const { error: insertError } = await supabase
      .from("user_media_logs")
      .insert({
        user_id: user.id,
        media_id: mediaId,
        media_type: mediaType,
        ...fields,
      });

    if (insertError) {
      return {
        ok: false,
        message: `${insertError.message} — ensure column on_list exists (see supabase/user_media_logs.sql).`,
      };
    }
  }

  return { ok: true, state: next, message: "Updated" };
}
