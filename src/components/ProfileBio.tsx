"use client";

import { useEffect, useRef, useState } from "react";
import { updateProfileBio } from "@/app/actions/profile";
import { cn } from "@/lib/cn";

const BIO_MAX_LENGTH = 280;

interface ProfileBioProps {
  initialBio: string | null;
  isOwner: boolean;
  username: string;
  /** Left-aligned sidebar style (Backloggd-inspired) */
  variant?: "default" | "sidebar";
}

export default function ProfileBio({
  initialBio,
  isOwner,
  username,
  variant = "default",
}: ProfileBioProps) {
  const [bio, setBio] = useState(initialBio ?? "");
  const [draft, setDraft] = useState(initialBio ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sidebar = variant === "sidebar";

  useEffect(() => {
    setBio(initialBio ?? "");
    if (!editing) setDraft(initialBio ?? "");
  }, [initialBio, editing]);

  useEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  async function save() {
    if (saving) return;
    const next = draft.trim();
    if (next === (bio.trim() || "")) {
      setEditing(false);
      setDraft(bio);
      return;
    }

    const previous = bio;
    setBio(next);
    setEditing(false);
    setSaving(true);

    const result = await updateProfileBio(next);
    setSaving(false);

    if (!result.ok) {
      setBio(previous);
      setDraft(previous);
      return;
    }

    setBio(result.profile.bio ?? "");
    setDraft(result.profile.bio ?? "");
  }

  function cancel() {
    setDraft(bio);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className={cn("w-full space-y-2", !sidebar && "mx-auto max-w-md")}>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, BIO_MAX_LENGTH))}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void save();
            }
          }}
          rows={3}
          placeholder="Tell people a bit about yourself…"
          className={cn(
            "w-full resize-none rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm leading-relaxed text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-white/[0.18]",
            !sidebar && "text-center"
          )}
          disabled={saving}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-600">
            {draft.length}/{BIO_MAX_LENGTH}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="rounded-md px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    if (!bio.trim()) {
      return sidebar ? (
        <p className="text-sm text-zinc-600">Nothing here!</p>
      ) : null;
    }
    return (
      <p
        className={cn(
          "text-sm leading-relaxed text-zinc-400",
          !sidebar && "mx-auto max-w-md text-center"
        )}
      >
        {bio}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "block w-full rounded-lg px-0 py-1 text-sm leading-relaxed transition",
        sidebar ? "text-left" : "mx-auto max-w-md px-3 py-2 text-center",
        bio.trim()
          ? "text-zinc-400 hover:text-zinc-300"
          : "text-zinc-600 hover:text-zinc-400"
      )}
      title="Edit bio"
    >
      {bio.trim() ||
        (sidebar ? "Nothing here!" : `Add a bio for ${username}…`)}
    </button>
  );
}
