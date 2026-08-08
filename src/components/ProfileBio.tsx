"use client";

import { useEffect, useRef, useState } from "react";
import { updateProfileBio } from "@/app/actions/profile";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/cn";

const BIO_MAX_LENGTH = 280;

interface ProfileBioProps {
  initialBio: string | null;
  isOwner: boolean;
  username: string;
}

export default function ProfileBio({
  initialBio,
  isOwner,
  username,
}: ProfileBioProps) {
  const { showToast } = useToast();
  const [bio, setBio] = useState(initialBio ?? "");
  const [draft, setDraft] = useState(initialBio ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      showToast(result.message, "error");
      return;
    }

    setBio(result.profile.bio ?? "");
    setDraft(result.profile.bio ?? "");
  }

  function cancel() {
    setDraft(bio);
    setEditing(false);
  }

  if (!isOwner) {
    if (!bio.trim()) return null;
    return (
      <p className="mx-auto max-w-md text-center text-sm leading-relaxed text-zinc-400">
        {bio}
      </p>
    );
  }

  if (editing) {
    return (
      <div className="mx-auto w-full max-w-md space-y-2">
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
          className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 text-center text-sm leading-relaxed text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-emerald-600/60"
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
              className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 transition hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "mx-auto block max-w-md rounded-xl px-3 py-2 text-center text-sm leading-relaxed transition",
        bio.trim()
          ? "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-300"
          : "text-zinc-600 hover:bg-zinc-900/60 hover:text-zinc-400"
      )}
      title="Edit bio"
    >
      {bio.trim() || `Add a bio for @${username}…`}
    </button>
  );
}
