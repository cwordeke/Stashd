"use client";

import Image from "next/image";
import { useState } from "react";
import StashPosterTilt from "@/components/StashPosterTilt";
import Top4PickerModal from "@/components/Top4PickerModal";
import { useStash } from "@/context/StashContext";
import { cn } from "@/lib/cn";
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
}

export default function Top4Shelf({
  type,
  items,
  editable = false,
}: Top4ShelfProps) {
  const { removeFromStash } = useStash();
  const [pickerOpen, setPickerOpen] = useState(false);

  const slots: StashSlot[] = [...items];
  while (slots.length < 4) slots.push(null);
  const label = MEDIA_TYPE_LABELS[type];

  return (
    <section className="space-y-2.5">
      <h3 className="text-sm font-medium text-zinc-400">{label}</h3>

      <div className="stash-poster-scene grid grid-cols-4 gap-2 sm:gap-2.5">
        {slots.slice(0, 4).map((item, index) => {
          if (item) {
            const href = mediaDetailPath(item.mediaType, item.id);

            return (
              <div
                key={item.stashId ?? `${item.id}-${index}`}
                className="group relative"
              >
                <StashPosterTilt href={href} title={item.title}>
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 22vw, 110px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center px-1 text-center text-[10px] leading-tight text-zinc-500">
                      {item.title}
                    </span>
                  )}
                </StashPosterTilt>

                {editable && item.stashId ? (
                  <button
                    type="button"
                    onClick={() => removeFromStash(item.stashId!, item)}
                    className={cn(
                      "absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full",
                      "bg-black/70 text-xs text-white opacity-0 transition",
                      "hover:bg-red-600 group-hover:opacity-100 focus-visible:opacity-100"
                    )}
                    aria-label={`Remove ${item.title} from stash`}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            );
          }

          if (editable) {
            return (
              <StashPosterTilt
                key={`empty-${type}-${index}`}
                as="button"
                onClick={() => setPickerOpen(true)}
                title={`Add to ${label}`}
                className="flex items-center justify-center bg-zinc-900/80 hover:bg-zinc-800/90"
              >
                <PlusIcon />
              </StashPosterTilt>
            );
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
