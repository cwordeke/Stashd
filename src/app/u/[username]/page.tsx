import { notFound } from "next/navigation";
import { Suspense } from "react";
import PublicProfileView from "@/components/PublicProfileView";
import { fetchProfileTabData } from "@/app/actions/profile-tabs";
import { getDiaryLogStats } from "@/app/actions/profile-media";
import { getUserRatingStats } from "@/app/actions/ratings";
import {
  checkIfFollowing,
  getProfileFollowStats,
} from "@/app/actions/social";
import { getProfileByUsername } from "@/lib/profile";
import { parseProfileTab } from "@/lib/profile-tabs";
import { emptyShelves } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    return { title: "Profile not found · Stashd" };
  }

  return {
    title: `${profile.username} · Stashd`,
    description: `Check out ${profile.username}'s stash on Stashd`,
  };
}

export default async function PublicProfilePage({
  params,
  searchParams,
}: PublicProfilePageProps) {
  const { username } = await params;
  const { tab: tabParam } = await searchParams;
  const initialTab = parseProfileTab(tabParam);

  const [profile, supabase] = await Promise.all([
    getProfileByUsername(username),
    createClient(),
  ]);

  if (!profile) {
    notFound();
  }

  const auth = await supabase.auth.getUser();
  const viewerId = auth.data.user?.id ?? null;
  const isOwner = viewerId === profile.id;

  // Always: sidebar stats. Tab content: only the active tab.
  const [ratingStats, followStats, diaryLogStats, isFollowing, tabPayload] =
    await Promise.all([
      getUserRatingStats(profile.id),
      getProfileFollowStats(profile.id),
      getDiaryLogStats(profile.id),
      viewerId && !isOwner
        ? checkIfFollowing(profile.id)
        : Promise.resolve(false),
      fetchProfileTabData(profile.id, initialTab),
    ]);

  const socialStats = {
    totalLogs: diaryLogStats.totalLogs,
    logsThisYear: diaryLogStats.logsThisYear,
    followers: followStats.followers,
    following: followStats.following,
  };

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-zinc-500">
          Loading profile…
        </div>
      }
    >
      <PublicProfileView
        username={profile.username}
        avatarUrl={profile.avatarUrl}
        bio={profile.bio}
        shelves={tabPayload.shelves ?? emptyShelves()}
        stashItems={tabPayload.stashItems ?? []}
        diaryEntries={tabPayload.diaryEntries ?? []}
        recentDiary={tabPayload.recentDiary ?? []}
        watchlistItems={tabPayload.watchlistItems ?? []}
        lists={tabPayload.lists ?? []}
        ratingStats={ratingStats}
        socialStats={socialStats}
        isOwner={isOwner}
        isLoggedIn={Boolean(viewerId)}
        profileUserId={profile.id}
        initialIsFollowing={isFollowing}
        initialTab={initialTab}
        initialLoadedTabs={[initialTab]}
      />
    </Suspense>
  );
}
