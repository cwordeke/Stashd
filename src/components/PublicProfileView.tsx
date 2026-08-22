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
import { ProfileIdentityHeader } from "@/components/FollowButton";
import ProfileBio from "@/components/ProfileBio";
import ProfileDiaryTab from "@/components/ProfileDiaryTab";
import ProfileListsTab from "@/components/ProfileListsTab";
import ProfileStashTab from "@/components/ProfileStashTab";
import ProfileStats, {
  type ProfileSocialStats,
} from "@/components/ProfileStats";
import ProfileWatchlistTab from "@/components/ProfileWatchlistTab";
import RatingDistribution from "@/components/RatingDistribution";
import Top4Shelf from "@/components/Top4Shelf";
import type { UserRatingStats } from "@/lib/ratings";
import { useStash } from "@/context/StashContext";
import { cn } from "@/lib/cn";
import {
  PROFILE_TAB_LABELS,
  PROFILE_TABS,
  parseProfileTab,
  type DiaryEntry,
  type ListSummary,
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
  lists: ListSummary[];
  ratingStats: UserRatingStats;
  socialStats: ProfileSocialStats;
  isOwner: boolean;
  isLoggedIn: boolean;
  profileUserId: string;
  initialIsFollowing: boolean;
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
  lists,
  ratingStats,
  socialStats,
  isOwner,
  isLoggedIn,
  profileUserId,
  initialIsFollowing,
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

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      {/* Identity — left-aligned, circular avatar */}
      <header className="flex items-start gap-4 sm:gap-5">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${username}'s avatar`}
            width={88}
            height={88}
            className="h-[72px] w-[72px] shrink-0 rounded-full border border-zinc-700 object-cover sm:h-[88px] sm:w-[88px]"
            priority
          />
        ) : (
          <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-emerald-600 text-2xl font-semibold text-white sm:h-[88px] sm:w-[88px] sm:text-3xl">
            {username.charAt(0).toUpperCase()}
          </span>
        )}

        <ProfileIdentityHeader
          username={username}
          profileUserId={profileUserId}
          isOwner={isOwner}
          isLoggedIn={isLoggedIn}
          initialIsFollowing={initialIsFollowing}
          followers={socialStats.followers}
          following={socialStats.following}
          ratingStats={ratingStats}
        />
      </header>

      {/* Tabs — centered under header */}
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
              "pointer-events-none absolute bottom-0 h-0.5 bg-emerald-500",
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

      {/* Body: sidebar + main */}
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <aside className="space-y-6 lg:border-r lg:border-zinc-800/80 lg:pr-6">
          <section>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Bio
            </h2>
            <div className="mt-2">
              <ProfileBio
                initialBio={bio}
                isOwner={isOwner}
                username={username}
                variant="sidebar"
              />
            </div>
          </section>

          <ProfileStats social={socialStats} />

          <section>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Personal ratings
            </h2>
            <div className="mt-3">
              <RatingDistribution stats={ratingStats} />
            </div>
          </section>
        </aside>

        <div className="min-w-0 w-full">
          {/* Shared panel shell so every tab owns the same width / baseline height */}
          <div className="w-full min-h-[32rem] sm:min-h-[36rem]">
            {tab === "top4" ? (
              <section className="grid w-full grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
                {GRID_TYPES.map((type) => (
                  <Top4Shelf
                    key={type}
                    type={type}
                    items={displayShelves[type]}
                    editable={isOwner}
                  />
                ))}
                <Top4Shelf
                  type="music"
                  items={displayShelves.music}
                  editable={isOwner}
                />
              </section>
            ) : null}

            {tab === "stash" ? (
              <div className="w-full">
                <ProfileStashTab items={stashItems} />
              </div>
            ) : null}
            {tab === "diary" ? (
              <div className="w-full">
                <ProfileDiaryTab entries={diaryEntries} />
              </div>
            ) : null}
            {tab === "watchlist" ? (
              <div className="w-full">
                <ProfileWatchlistTab items={watchlistItems} />
              </div>
            ) : null}
            {tab === "lists" ? (
              <div className="w-full">
                <ProfileListsTab
                  username={username}
                  lists={lists}
                  isOwner={isOwner}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
