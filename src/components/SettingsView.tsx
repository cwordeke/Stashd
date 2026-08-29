"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  updateProfileAvatar,
  updateProfileBio,
} from "@/app/actions/profile";
import ImportHub from "@/components/ImportHub";
import NavLink from "@/components/NavLink";
import PreferencesSettings from "@/components/PreferencesSettings";
import { useNavigationPending } from "@/context/NavigationPendingContext";
import { profilePath } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { notifyProfileUpdated } from "@/lib/profile-events";
import { notifyTutorialReplay } from "@/lib/tutorial-events";
import { resetTutorial } from "@/app/actions/tutorial";
import type { MediaType } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";

const BIO_MAX_LENGTH = 280;
const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

type SettingsGroup = "account" | "preferences" | "data";

const SETTINGS_GROUPS: { id: SettingsGroup; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "preferences", label: "Preferences" },
  { id: "data", label: "Data" },
];

interface SettingsViewProps {
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  email: string | null;
  preferredCategories: MediaType[];
  initialGroup?: SettingsGroup;
  spotifyStatus?: "success" | "error" | null;
}

export default function SettingsView({
  username,
  avatarUrl: initialAvatarUrl,
  bio: initialBio,
  email,
  preferredCategories,
  initialGroup = "account",
  spotifyStatus = null,
}: SettingsViewProps) {
  const router = useRouter();
  const { beginNavigation } = useNavigationPending();
  const profileHref = profilePath(username);
  const [group, setGroup] = useState<SettingsGroup>(initialGroup);

  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Map<SettingsGroup, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({
    top: 0,
    height: 0,
    ready: false,
  });

  const updateIndicator = useCallback(() => {
    const nav = navRef.current;
    const activeEl = itemRefs.current.get(group);
    if (!nav || !activeEl) return;

    const navRect = nav.getBoundingClientRect();
    const tabRect = activeEl.getBoundingClientRect();
    if (tabRect.height === 0) return;

    setIndicator({
      top: tabRect.top - navRect.top + nav.scrollTop,
      height: tabRect.height,
      ready: true,
    });
  }, [group]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const onResize = () => updateIndicator();
    window.addEventListener("resize", onResize);

    const activeEl = itemRefs.current.get(group);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onResize)
        : null;
    ro?.observe(nav);
    if (activeEl) ro?.observe(activeEl);

    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [updateIndicator, group]);

  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState(initialBio ?? "");
  const [draft, setDraft] = useState(initialBio ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setAvatarUrl(initialAvatarUrl);
  }, [initialAvatarUrl]);

  useEffect(() => {
    setBio(initialBio ?? "");
    setDraft(initialBio ?? "");
  }, [initialBio]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const dirty = draft.trim() !== (bio.trim() || "");
  const displayAvatar = avatarPreview ?? avatarUrl;

  async function handleAvatarChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || avatarUploading) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (!file.type.startsWith("image/")) {
      setAvatarError("Choose an image file");
      setAvatarMessage(null);
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError("Image must be 5 MB or smaller");
      setAvatarMessage(null);
      return;
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return preview;
    });
    setAvatarUploading(true);
    setAvatarError(null);
    setAvatarMessage(null);

    const formData = new FormData();
    formData.set("avatar", file);

    const result = await updateProfileAvatar(formData);
    setAvatarUploading(false);

    if (!result.ok) {
      setAvatarError(result.message);
      setAvatarPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    setAvatarUrl(result.profile.avatarUrl);
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAvatarMessage(result.message);
    notifyProfileUpdated();
    router.refresh();
  }

  async function saveBio() {
    if (saving || !dirty) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    const result = await updateProfileBio(draft);
    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setBio(result.profile.bio ?? "");
    setDraft(result.profile.bio ?? "");
    setMessage("Bio saved");
    router.refresh();
  }

  async function handleReplayTutorial() {
    await resetTutorial();
    notifyTutorialReplay();
    beginNavigation("/");
    router.push("/");
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    beginNavigation("/");
    router.push("/");
    router.refresh();
    setSigningOut(false);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-2">
        <NavLink
          href={profileHref}
          className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <BackGlyph className="h-3.5 w-3.5" />
          Back to profile
        </NavLink>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Settings
        </h1>
        <p className="text-sm text-zinc-500">
          Manage your account and public profile.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10">
        <nav
          ref={navRef}
          aria-label="Settings groups"
          className="relative flex flex-col gap-0.5 border-r border-white/[0.06] pr-6"
        >
          {SETTINGS_GROUPS.map((item) => {
            const active = group === item.id;
            return (
              <button
                key={item.id}
                type="button"
                ref={(el) => {
                  if (el) itemRefs.current.set(item.id, el);
                  else itemRefs.current.delete(item.id);
                }}
                onClick={() => setGroup(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "px-3 py-2.5 pl-3.5 text-left text-[13px] font-medium transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
                  active
                    ? "text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {item.label}
              </button>
            );
          })}

          <span
            className={cn(
              "pointer-events-none absolute left-0 w-0.5 bg-emerald-500",
              indicator.ready
                ? "opacity-100 transition-[top,height,opacity] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                : "opacity-0"
            )}
            style={{ top: indicator.top, height: indicator.height }}
            aria-hidden
          />
        </nav>

        <div className="min-w-0">
          {group === "account" ? (
            <div className="space-y-6">
              <section className="border border-white/10 bg-zinc-900/50">
                <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
                  <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                    Profile picture
                  </h2>
                </div>

                <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                      className={cn(
                        "group relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-zinc-700",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
                        "disabled:cursor-not-allowed"
                      )}
                      aria-label="Change profile picture"
                    >
                      {displayAvatar ? (
                        avatarPreview ? (
                          // Local blob preview — next/image can't load blob: URLs reliably
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarPreview}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Image
                            src={displayAvatar}
                            alt=""
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                            unoptimized={displayAvatar.includes("/storage/v1/")}
                          />
                        )
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-emerald-600 text-xl font-semibold text-white">
                          {username.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-medium uppercase tracking-[0.12em] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        {avatarUploading ? "…" : "Edit"}
                      </span>
                    </button>

                    <div className="min-w-0">
                      <p className="text-[13px] text-zinc-200">
                        Upload a new photo
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        JPEG, PNG, WebP, or GIF · up to 5 MB
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={AVATAR_ACCEPT}
                      className="sr-only"
                      onChange={(e) => void handleAvatarChange(e.target.files)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                      className={cn(
                        "rounded-md bg-emerald-600 px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors",
                        "hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                    >
                      {avatarUploading ? "Uploading…" : "Choose photo"}
                    </button>
                    {avatarMessage ? (
                      <p className="text-sm text-emerald-400">{avatarMessage}</p>
                    ) : null}
                    {avatarError ? (
                      <p className="max-w-xs text-sm text-red-400 sm:text-right">
                        {avatarError}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="border border-white/10 bg-zinc-900/50">
                <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
                  <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                    Details
                  </h2>
                </div>

                <div className="flex items-center gap-4 px-4 py-5 sm:px-5">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt=""
                      width={56}
                      height={56}
                      className="h-14 w-14 shrink-0 rounded-full border border-zinc-700 object-cover"
                      unoptimized={avatarUrl.includes("/storage/v1/")}
                    />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xl font-semibold text-white">
                      {username.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-white">
                      @{username}
                    </p>
                    {email ? (
                      <p className="mt-0.5 truncate text-sm text-zinc-500">
                        {email}
                      </p>
                    ) : null}
                  </div>
                </div>

                <dl className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                  <div className="flex items-baseline justify-between gap-4 px-4 py-3.5 sm:px-5">
                    <dt className="text-[13px] text-zinc-500">Username</dt>
                    <dd className="truncate text-[13px] text-zinc-200">
                      @{username}
                    </dd>
                  </div>
                  {email ? (
                    <div className="flex items-baseline justify-between gap-4 px-4 py-3.5 sm:px-5">
                      <dt className="text-[13px] text-zinc-500">Email</dt>
                      <dd className="truncate text-[13px] text-zinc-200">
                        {email}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              <section className="border border-white/10 bg-zinc-900/50">
                <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
                  <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                    Profile bio
                  </h2>
                </div>

                <div className="space-y-3 px-4 py-5 sm:px-5">
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value.slice(0, BIO_MAX_LENGTH));
                      setMessage(null);
                      setError(null);
                    }}
                    rows={4}
                    placeholder="Tell people a bit about yourself…"
                    className="w-full resize-none rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm leading-relaxed text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-white/[0.18]"
                    disabled={saving}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[11px] text-zinc-600">
                      {draft.length}/{BIO_MAX_LENGTH}
                    </span>
                    <button
                      type="button"
                      onClick={() => void saveBio()}
                      disabled={saving || !dirty}
                      className={cn(
                        "rounded-md bg-emerald-600 px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors",
                        "hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                    >
                      {saving ? "Saving…" : "Save bio"}
                    </button>
                  </div>
                  {message ? (
                    <p className="text-sm text-emerald-400">{message}</p>
                  ) : null}
                  {error ? (
                    <p className="text-sm text-red-400">{error}</p>
                  ) : null}
                </div>
              </section>

              <section className="border border-white/10 bg-zinc-900/50">
                <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
                  <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                    Session
                  </h2>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-[13px] text-zinc-200">
                      Replay tutorial
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Walk through the app tour again.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleReplayTutorial}
                    className="shrink-0 rounded-md border border-white/10 px-3.5 py-1.5 text-[13px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.05]"
                  >
                    Replay
                  </button>
                </div>
                <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-[13px] text-zinc-200">
                      Sign out of Stashd
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      You can sign back in anytime with Google.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={signingOut}
                    className="shrink-0 rounded-md border border-white/10 px-3.5 py-1.5 text-[13px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {group === "preferences" ? (
            <PreferencesSettings preferredCategories={preferredCategories} />
          ) : null}

          {group === "data" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  Import
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Migrate your history from other platforms.
                </p>
              </div>
              <ImportHub spotifyStatus={spotifyStatus} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BackGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M10 3.5 5.5 8 10 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
