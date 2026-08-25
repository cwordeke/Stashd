"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePreferredCategories } from "@/app/actions/profile";
import { cn } from "@/lib/cn";
import { orderedMediaTypes } from "@/lib/media-order";
import { MEDIA_TYPE_LABELS, type MediaType } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";

interface PreferencesSettingsProps {
  preferredCategories: MediaType[];
}

function sameOrder(a: MediaType[], b: MediaType[]) {
  return a.length === b.length && a.every((type, index) => type === b[index]);
}

export default function PreferencesSettings({
  preferredCategories,
}: PreferencesSettingsProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(() =>
    orderedMediaTypes(preferredCategories)
  );
  const [order, setOrder] = useState(saved);
  const [dragType, setDragType] = useState<MediaType | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = orderedMediaTypes(preferredCategories);
    setSaved(next);
    setOrder(next);
  }, [preferredCategories]);

  const dirty = !sameOrder(order, saved);

  function moveType(fromType: MediaType, toType: MediaType) {
    if (fromType === toType) return;
    setOrder((current) => {
      const next = [...current];
      const fromIndex = next.indexOf(fromType);
      const toIndex = next.indexOf(toType);
      if (fromIndex < 0 || toIndex < 0) return current;
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setMessage(null);
    setError(null);
  }

  function nudge(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    moveType(order[index], order[target]);
  }

  async function saveOrder() {
    if (saving || !dirty) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    const result = await updatePreferredCategories(order);
    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    const next = orderedMediaTypes(result.profile.preferredCategories);
    setSaved(next);
    setOrder(next);
    setMessage(result.message);

    const supabase = createClient();
    void supabase.auth.updateUser({
      data: { preferred_categories: next },
    });

    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
          Media types
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Drag to reorder. This controls header navigation and the Top 4 on
          your profile.
        </p>
      </div>

      <section className="border border-white/10 bg-zinc-900/50">
        <ul className="divide-y divide-white/[0.06]">
          {order.map((type, index) => (
            <li
              key={type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", type);
                setDragType(type);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragType) moveType(dragType, type);
                setDragType(null);
              }}
              onDragEnd={() => setDragType(null)}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 sm:px-5",
                dragType === type && "opacity-40"
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/10 text-sm font-semibold text-zinc-200">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 text-[13px] font-medium text-white">
                {MEDIA_TYPE_LABELS[type]}
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => nudge(index, -1)}
                  disabled={index === 0 || saving}
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`Move ${MEDIA_TYPE_LABELS[type]} up`}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => nudge(index, 1)}
                  disabled={index === order.length - 1 || saving}
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`Move ${MEDIA_TYPE_LABELS[type]} down`}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <span
                  className="cursor-grab rounded-md p-1.5 text-zinc-600 active:cursor-grabbing"
                  title="Drag to reorder"
                  aria-hidden
                >
                  <GripIcon className="h-4 w-4" />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {message ? (
          <p className="text-sm text-emerald-400">{message}</p>
        ) : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="button"
          onClick={() => void saveOrder()}
          disabled={saving || !dirty}
          className={cn(
            "rounded-md bg-emerald-600 px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors",
            "hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {saving ? "Saving…" : "Save order"}
        </button>
      </div>
    </div>
  );
}

function ChevronUp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M4 10 8 6l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GripIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="15" cy="7" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
    </svg>
  );
}
