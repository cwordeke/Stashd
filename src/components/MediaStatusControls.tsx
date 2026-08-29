"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { setMediaLogState } from "@/app/actions/media-logs";
import { cn } from "@/lib/cn";
import {
  completedStatusFor,
  mediaStatusLabels,
  type MediaLogState,
  type MediaLogStatus,
} from "@/lib/media-status";
import type { MediaType } from "@/lib/types";

/**
 * Scale so the drawn graphic (not empty PNG canvas padding) fills the same
 * ~20px box. Canvases: watched/listened/played 512, read 360, save 200.
 */
const COMPLETED_ICON: Record<MediaLogStatus, { src: string; scale: number }> = {
  watched: { src: "/watchedIcon.png", scale: 0.95 },
  played: { src: "/playedIcon.png", scale: 0.95 },
  read: { src: "/readIcon.png", scale: 1.11 },
  listened: { src: "/listenedIcon.png", scale: 0.83 },
};

const SAVE_ICON = { src: "/saveIcon.png", scale: 0.99 };

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
  const completedIcon = COMPLETED_ICON[completedStatusFor(mediaType)];

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
        icon={
          <StatusGlyph
            src={completedIcon.src}
            scale={completedIcon.scale}
            active={state.completed}
          />
        }
      />
      <StatusButton
        label={labels.list}
        active={state.onList}
        onClick={() => toggle("onList")}
        icon={
          <StatusGlyph
            src={SAVE_ICON.src}
            scale={SAVE_ICON.scale}
            active={state.onList}
          />
        }
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
        "flex min-h-11 flex-col items-center justify-center gap-1 rounded-md border px-1.5 py-2 text-[10px] font-medium transition-colors",
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

function StatusGlyph({
  src,
  scale,
  active,
}: {
  src: string;
  scale: number;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fill = active ? "#34d399" : "#71717a";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    let cancelled = false;

    img.onload = () => {
      if (cancelled) return;
      const css = 24;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(css * dpr);
      canvas.height = Math.round(css * dpr);
      canvas.style.width = `${css}px`;
      canvas.style.height = `${css}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, css, css);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const draw = css * scale;
      const origin = (css - draw) / 2;
      ctx.drawImage(img, origin, origin, draw, draw);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, css, css);
    };

    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, scale, fill]);

  return <canvas ref={canvasRef} className="h-6 w-6" aria-hidden />;
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
