"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { setMediaLogState } from "@/app/actions/media-logs";
import { cn } from "@/lib/cn";
import {
  mediaStatusLabels,
  type MediaLogState,
} from "@/lib/media-status";
import type { MediaType } from "@/lib/types";

interface MediaStatusControlsProps {
  mediaId: string;
  mediaType: MediaType;
  initialState: MediaLogState;
  isAuthenticated: boolean;
  mediaMeta?: {
    title: string;
    creator: string;
    year: string;
    thumbnail: string | null;
  };
}

export default function MediaStatusControls({
  mediaId,
  mediaType,
  initialState,
  isAuthenticated,
  mediaMeta,
}: MediaStatusControlsProps) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  const syncedRef = useRef(initialState);
  const persistChainRef = useRef(Promise.resolve());
  const labels = mediaStatusLabels(mediaType);

  useEffect(() => {
    setState(initialState);
    stateRef.current = initialState;
    syncedRef.current = initialState;
  }, [initialState]);

  function persist() {
    persistChainRef.current = persistChainRef.current
      .catch(() => undefined)
      .then(async () => {
        const latest = stateRef.current;
        if (
          syncedRef.current.completed === latest.completed &&
          syncedRef.current.onList === latest.onList &&
          syncedRef.current.liked === latest.liked
        ) {
          return;
        }

        const snapshot = { ...latest };
        const result = await setMediaLogState(
          mediaId,
          mediaType,
          snapshot,
          mediaMeta
        );

        if (!result.ok) {
          setState(syncedRef.current);
          stateRef.current = syncedRef.current;
          return;
        }

        if (
          stateRef.current.completed === snapshot.completed &&
          stateRef.current.onList === snapshot.onList &&
          stateRef.current.liked === snapshot.liked
        ) {
          syncedRef.current = snapshot;
        }
      });
  }

  function toggle(field: "completed" | "onList" | "liked") {
    if (!isAuthenticated) {
      const next = encodeURIComponent(
        `${window.location.pathname}${window.location.search}`
      );
      router.push(`/login?next=${next}`);
      return;
    }

    const next = { ...stateRef.current, [field]: !stateRef.current[field] };
    stateRef.current = next;
    setState(next);
    persist();
  }

  return (
    <div className="grid grid-cols-3 gap-1.5">
      <StatusButton
        label={labels.completed}
        active={state.completed}
        onClick={() => toggle("completed")}
        icon={<CheckIcon />}
      />
      <StatusButton
        label={labels.list}
        active={state.onList}
        onClick={() => toggle("onList")}
        icon={<ListIcon />}
      />
      <StatusButton
        label="Like"
        active={state.liked}
        onClick={() => toggle("liked")}
        icon={<HeartIcon filled={state.liked} />}
        ariaLabel={state.liked ? "Unlike" : "Like"}
      />
    </div>
  );
}

function StatusButton({
  label,
  active,
  onClick,
  icon,
  ariaLabel,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel ?? label}
      title={label}
      className={cn(
        "flex flex-col items-center gap-1 rounded-md border px-1.5 py-2 text-[10px] font-medium transition-colors",
        active
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center",
          active ? "text-emerald-400" : "text-zinc-500"
        )}
      >
        {icon}
      </span>
      <span className="line-clamp-1 w-full text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        d="M12 20s-7-4.4-7-9.2C5 7.5 7.2 5.5 9.6 5.5c1.4 0 2.6.7 3.4 1.8.8-1.1 2-1.8 3.4-1.8 2.4 0 4.6 2 4.6 5.3C21 15.6 12 20 12 20z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
