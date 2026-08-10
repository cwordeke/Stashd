"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import ProfileBio from "@/components/ProfileBio";
import ProfileDiaryTab from "@/components/ProfileDiaryTab";
import ProfileListsTab from "@/components/ProfileListsTab";
import ProfileStashTab from "@/components/ProfileStashTab";
import ProfileWatchlistTab from "@/components/ProfileWatchlistTab";
import Top4Shelf from "@/components/Top4Shelf";
import { useStash } from "@/context/StashContext";
import { cn } from "@/lib/cn";
import {
  PROFILE_TAB_LABELS,
  PROFILE_TABS,
  parseProfileTab,
  type DiaryEntry,
  type ProfileTab,
  type StashTabItem,
  type WatchlistItem,
} from "@/lib/profile-tabs";
import { type MediaType, type StashShelves } from "@/lib/types";

const GRID_TYPES: MediaType[] = ["movie", "tv", "game", "book"];

interface PublicProfileViewProps {
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  shelves: StashShelves;
  stashItems: StashTabItem[];
  diaryEntries: DiaryEntry[];
  watchlistItems: WatchlistItem[];
  isOwner: boolean;
  initialTab?: ProfileTab;
}

export default function PublicProfileView({
  username,
  avatarUrl,
  bio,
  shelves,
  stashItems,
  diaryEntries,
  watchlistItems,
  isOwner,
  initialTab = "top4",
}: PublicProfileViewProps) {
  const pathname = usePathname();
  const [tab, setTab] = useState<ProfileTab>(initialTab);
  const { shelves: optimisticShelves } = useStash();
  const displayShelves = isOwner ? optimisticShelves : shelves;

  const listRef = useRef<HTMLUListElement>(null);
  const tabRefs = useRef<Map<ProfileTab, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const updateIndicator = useCallback(() => {
    const list = listRef.current;
    const activeEl = tabRefs.current.get(tab);
    if (!list || !activeEl) return;

    const listRect = list.getBoundingClientRect();
    const tabRect = activeEl.getBoundingClientRect();
    setIndicator({
      left: tabRect.left - listRect.left + list.scrollLeft,
      width: tabRect.width,
      ready: true,
    });
  }, [tab]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, tab]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const onResize = () => updateIndicator();
    window.addEventListener("resize", onResize);

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onResize)
        : null;
    ro?.observe(list);

    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [updateIndicator]);

  // Keep local tab in sync if server sends a new initialTab (rare)
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Browser back/forward
  useEffect(() => {
    function onPopState() {
      const params = new URLSearchParams(window.location.search);
      setTab(parseProfileTab(params.get("tab")));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function selectTab(id: ProfileTab) {
    if (id === tab) return;
    setTab(id);
    const href = id === "top4" ? pathname : `${pathname}?tab=${id}`;
    window.history.pushState({ tab: id }, "", href);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col items-center text-center">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${username}'s avatar`}
            width={96}
            height={96}
            className="rounded-full border border-zinc-700 shadow-lg shadow-black/40"
            priority
          />
        ) : (
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-600 text-3xl font-semibold text-white shadow-lg shadow-black/40">
            {username.charAt(0).toUpperCase()}
          </span>
        )}

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {username}
        </h1>

        <div className="mt-3 w-full">
          <ProfileBio
            initialBio={bio}
            isOwner={isOwner}
            username={username}
          />
        </div>
      </header>

      <div className="space-y-8">
        <nav className="flex justify-center" aria-label="Profile sections">
          <ul
            ref={listRef}
            className="relative flex w-full max-w-xl items-end justify-between gap-1 border-b border-zinc-800/90 sm:justify-center sm:gap-8"
          >
            {PROFILE_TABS.map((id) => {
              const active = tab === id;

              return (
                <li key={id} className="min-w-0 flex-1 sm:flex-none">
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) tabRefs.current.set(id, el);
                      else tabRefs.current.delete(id);
                    }}
                    onClick={() => selectTab(id)}
                    className={cn(
                      "relative flex w-full cursor-pointer justify-center px-1 pb-3 pt-1 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-300 sm:px-2 sm:text-xs",
                      active
                        ? "text-white"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="truncate">{PROFILE_TAB_LABELS[id]}</span>
                  </button>
                </li>
              );
            })}

            <span
              className={cn(
                "pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-emerald-500",
                "shadow-[0_0_12px_rgba(16,185,129,0.55)]",
                indicator.ready
                  ? "opacity-100 transition-[left,width,opacity] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                  : "opacity-0"
              )}
              style={{
                left: indicator.left,
                width: indicator.width,
              }}
              aria-hidden
            />
          </ul>
        </nav>

        <div>
          {tab === "top4" ? (
            <section className="space-y-8">
              <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
                {GRID_TYPES.map((type) => (
                  <Top4Shelf
                    key={type}
                    type={type}
                    items={displayShelves[type]}
                    editable={isOwner}
                  />
                ))}
              </div>
              <div className="mx-auto w-full md:max-w-[calc(50%-1rem)]">
                <Top4Shelf
                  type="music"
                  items={displayShelves.music}
                  editable={isOwner}
                />
              </div>
            </section>
          ) : null}

          {tab === "stash" ? <ProfileStashTab items={stashItems} /> : null}
          {tab === "diary" ? (
            <ProfileDiaryTab entries={diaryEntries} />
          ) : null}
          {tab === "watchlist" ? (
            <ProfileWatchlistTab items={watchlistItems} />
          ) : null}
          {tab === "lists" ? <ProfileListsTab /> : null}
        </div>
      </div>
    </div>
  );
}
