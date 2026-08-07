import type { MediaType } from "@/lib/types";

export interface MediaLogState {
  completed: boolean;
  onList: boolean;
  liked: boolean;
}

export const EMPTY_MEDIA_LOG: MediaLogState = {
  completed: false,
  onList: false,
  liked: false,
};

export interface MediaStatusLabels {
  completed: string;
  list: string;
}

/** Values stored in user_media_logs.status (completed only; list uses on_list). */
export type MediaLogStatus = "watched" | "played" | "read" | "listened";

const COMPLETED_STATUSES: MediaLogStatus[] = [
  "watched",
  "played",
  "read",
  "listened",
];

export function mediaStatusLabels(mediaType: MediaType): MediaStatusLabels {
  switch (mediaType) {
    case "game":
      return { completed: "Played", list: "Backlog" };
    case "book":
      return { completed: "Read", list: "Reading list" };
    case "music":
      return { completed: "Listened", list: "Queue" };
    case "movie":
    case "tv":
    default:
      return { completed: "Watched", list: "Watchlist" };
  }
}

export function completedStatusFor(mediaType: MediaType): MediaLogStatus {
  switch (mediaType) {
    case "game":
      return "played";
    case "book":
      return "read";
    case "music":
      return "listened";
    case "movie":
    case "tv":
    default:
      return "watched";
  }
}

export function isCompletedStatus(
  status: string | null | undefined
): boolean {
  return (
    typeof status === "string" &&
    COMPLETED_STATUSES.includes(status as MediaLogStatus)
  );
}
