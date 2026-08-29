"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import StashPosterTilt from "@/components/StashPosterTilt";
import Top4PickerModal from "@/components/Top4PickerModal";
import { useStash } from "@/context/StashContext";
import { cn } from "@/lib/cn";
import { moveIndex, slotIndexFromX, STASH_TOP_N } from "@/lib/stash-utils";
import {
  MEDIA_TYPE_LABELS,
  mediaDetailPath,
  type MediaType,
  type StashSlot,
} from "@/lib/types";

interface Top4ShelfProps {
  type: MediaType;
  items: StashSlot[];
  editable?: boolean;
  tutorialAnchors?: boolean;
}

type FilledSlot = NonNullable<StashSlot> & { stashId: string };

interface DragState {
  stashId: string;
  item: FilledSlot;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PendingDrag {
  stashId: string;
  item: FilledSlot;
  startX: number;
  startY: number;
  grabX: number;
  grabY: number;
  width: number;
  height: number;
  origin: FilledSlot[];
}

const DRAG_THRESHOLD = 8;

function isFilled(item: StashSlot): item is FilledSlot {
  return Boolean(item?.stashId);
}

function sameOrder(a: FilledSlot[], b: FilledSlot[]) {
  return (
    a.length === b.length && a.every((item, index) => item.stashId === b[index].stashId)
  );
}

export default function Top4Shelf({
  type,
  items,
  editable = false,
  tutorialAnchors = false,
}: Top4ShelfProps) {
  const { removeFromStash, reorderStash } = useStash();
  const reduceMotion = useReducedMotion();
  const [pickerOpen, setPickerOpen] = useState(false);

  const filledFromProps = useMemo(() => items.filter(isFilled), [items]);
  const [order, setOrder] = useState(filledFromProps);
  const [drag, setDrag] = useState<DragState | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const orderRef = useRef(order);
  const dragRef = useRef<DragState | null>(null);
  const pendingRef = useRef<PendingDrag | null>(null);
  const suppressClickRef = useRef(false);

  orderRef.current = order;
  dragRef.current = drag;

  useEffect(() => {
    if (drag) return;
    setOrder(filledFromProps);
  }, [filledFromProps, drag]);

  useEffect(() => {
    if (!drag) return;

    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
    };
  }, [drag]);

  useEffect(() => {
    if (!editable) return;

    function finishDrag(cancelled: boolean) {
      const pending = pendingRef.current;
      const active = dragRef.current;
      pendingRef.current = null;

      if (!active) return;

      const origin = pending?.origin ?? orderRef.current;
      const next = orderRef.current;

      setDrag(null);
      dragRef.current = null;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 50);

      if (cancelled) {
        setOrder(origin);
        orderRef.current = origin;
        return;
      }

      if (!sameOrder(origin, next)) {
        reorderStash(
          type,
          next.map((item) => item.stashId)
        );
      }
    }

    function onPointerMove(event: PointerEvent) {
      const pending = pendingRef.current;
      if (!pending) return;

      const active = dragRef.current;
      const dx = event.clientX - pending.startX;
      const dy = event.clientY - pending.startY;

      if (!active && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!active && Math.abs(dx) < Math.abs(dy)) return;

      if (event.cancelable) event.preventDefault();

      if (!active) {
        suppressClickRef.current = true;
        const nextDrag: DragState = {
          stashId: pending.stashId,
          item: pending.item,
          x: event.clientX - pending.grabX,
          y: event.clientY - pending.grabY,
          width: pending.width,
          height: pending.height,
        };
        dragRef.current = nextDrag;
        orderRef.current = pending.origin;
        setOrder(pending.origin);
        setDrag(nextDrag);
      } else {
        const nextDrag = {
          ...active,
          x: event.clientX - pending.grabX,
          y: event.clientY - pending.grabY,
        };
        dragRef.current = nextDrag;
        setDrag(nextDrag);
      }

      const grid = gridRef.current;
      if (!grid) return;

      const fromIndex = orderRef.current.findIndex(
        (item) => item.stashId === pending.stashId
      );
      const toIndex = slotIndexFromX(
        event.clientX,
        grid.getBoundingClientRect(),
        orderRef.current.length
      );
      if (fromIndex === toIndex || fromIndex < 0) return;

      const next = moveIndex(orderRef.current, fromIndex, toIndex);
      orderRef.current = next;
      setOrder(next);
    }

    function onPointerUp() {
      finishDrag(false);
    }

    function onPointerCancel() {
      finishDrag(true);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") finishDrag(true);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [editable, reorderStash, type]);

  const display = drag ? order : filledFromProps;
  const emptyCount = Math.max(0, STASH_TOP_N - display.length);
  const label = MEDIA_TYPE_LABELS[type];
  const canDrag = editable && display.length > 1;
  const layoutEnabled = Boolean(editable && !reduceMotion && drag);

  function handlePosterPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
    item: FilledSlot
  ) {
    if (!canDrag || event.button !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    pendingRef.current = {
      stashId: item.stashId,
      item,
      startX: event.clientX,
      startY: event.clientY,
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      origin: display,
    };
  }

  function handlePosterClick(event: ReactMouseEvent<HTMLElement>) {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }

  return (
    <section
      className="space-y-2.5"
      {...(tutorialAnchors ? { "data-tutorial": "profile-top4" } : {})}
    >
      <h3 className="text-sm font-medium text-zinc-400">{label}</h3>

      <div
        ref={gridRef}
        className={cn(
          "stash-poster-scene grid grid-cols-4 gap-2 sm:gap-2.5",
          drag && "touch-none"
        )}
        {...(tutorialAnchors ? { "data-tutorial": "profile-top4-grid" } : {})}
      >
        {display.map((item) => {
          const href = mediaDetailPath(item.mediaType, item.id);
          const isDragging = drag?.stashId === item.stashId;

          return (
            <motion.div
              key={item.stashId}
              layout={layoutEnabled && !isDragging}
              initial={false}
              transition={{
                type: "spring",
                stiffness: 560,
                damping: 38,
                mass: 0.55,
              }}
              className={cn("group relative", canDrag && "touch-pan-y")}
              onPointerDown={(event) => handlePosterPointerDown(event, item)}
            >
              {isDragging ? (
                <div
                  className="aspect-[2/3] rounded-lg border border-dashed border-white/15 bg-zinc-900/55"
                  aria-hidden
                />
              ) : (
                <>
                  <StashPosterTilt
                    href={href}
                    title={
                      canDrag
                        ? `${item.title} — drag to reorder`
                        : item.title
                    }
                    tiltEnabled={!drag}
                    onClick={handlePosterClick}
                    className={canDrag ? "cursor-grab" : undefined}
                  >
                    <PosterArt item={item} />
                  </StashPosterTilt>

                  {editable ? (
                    <button
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => removeFromStash(item.stashId, item)}
                      className={cn(
                        "absolute right-1 top-1 z-10 touch-target flex items-center justify-center rounded-full",
                        "bg-black/70 text-xs text-white opacity-0 transition",
                        "hover:bg-red-600 group-hover:opacity-100 focus-visible:opacity-100"
                      )}
                      aria-label={`Remove ${item.title} from stash`}
                    >
                      ×
                    </button>
                  ) : null}
                </>
              )}
            </motion.div>
          );
        })}

        {Array.from({ length: emptyCount }, (_, index) => {
          if (editable) {
            const addButton = (
              <StashPosterTilt
                key={`empty-${type}-${index}`}
                as="button"
                onClick={() => setPickerOpen(true)}
                title={`Add to ${label}`}
                tiltEnabled={!drag}
                className="flex h-full w-full items-center justify-center bg-zinc-900/80 hover:bg-zinc-800/90"
              >
                <PlusIcon />
              </StashPosterTilt>
            );

            if (tutorialAnchors && index === 0) {
              return (
                <div
                  key={`empty-${type}-${index}`}
                  data-tutorial="profile-top4-add"
                  className="aspect-[2/3]"
                >
                  {addButton}
                </div>
              );
            }

            return addButton;
          }

          return (
            <div
              key={`empty-${type}-${index}`}
              className="flex aspect-[2/3] items-center justify-center rounded-lg bg-zinc-900/50"
              aria-hidden
            >
              <PlusIcon muted />
            </div>
          );
        })}
      </div>

      {drag
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[80]"
              style={{
                left: drag.x,
                top: drag.y,
                width: drag.width,
                height: drag.height,
                transform:
                  "perspective(900px) rotateX(7deg) rotateY(-10deg) translateZ(18px) scale(1.06)",
                filter:
                  "drop-shadow(0 18px 24px rgba(0,0,0,0.55)) drop-shadow(0 4px 8px rgba(0,0,0,0.35))",
              }}
            >
              <div className="stash-poster relative h-full w-full overflow-hidden rounded-lg bg-zinc-800">
                <PosterArt item={drag.item} />
              </div>
            </div>,
            document.body
          )
        : null}

      {editable && pickerOpen ? (
        <Top4PickerModal
          type={type}
          open
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </section>
  );
}

function PosterArt({ item }: { item: NonNullable<StashSlot> }) {
  if (item.thumbnail) {
    return (
      <Image
        src={item.thumbnail}
        alt={item.title}
        fill
        draggable={false}
        sizes="(max-width: 768px) 22vw, 110px"
        className="pointer-events-none object-cover"
      />
    );
  }

  return (
    <span className="flex h-full items-center justify-center px-1 text-center text-[10px] leading-tight text-zinc-500">
      {item.title}
    </span>
  );
}

function PlusIcon({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5", muted ? "text-zinc-700" : "text-zinc-500")}
      fill="none"
      aria-hidden
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
