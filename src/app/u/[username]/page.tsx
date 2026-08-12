import { notFound } from "next/navigation";
import { Suspense } from "react";
import PublicProfileView from "@/components/PublicProfileView";
import { getListsByUserId } from "@/app/actions/lists";
import {
  getDiaryEntriesByUserId,
  getStashTabItems,
  getWatchlistByUserId,
} from "@/app/actions/profile-media";
import { getUserRatingStats } from "@/app/actions/ratings";
import {
  checkIfFollowing,
  getProfileFollowStats,
} from "@/app/actions/social";
import { getStashShelvesByUserId } from "@/app/actions/stash";
import { getProfileByUsername } from "@/lib/profile";
import { parseProfileTab } from "@/lib/profile-tabs";
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

function buildSocialStats(
  diaryLoggedOn: string[],
  followStats: { followers: number; following: number }
) {
  const year = new Date().getFullYear();
  const yearPrefix = `${year}-`;

  return {
    totalLogs: diaryLoggedOn.length,
    logsThisYear: diaryLoggedOn.filter((date) => date.startsWith(yearPrefix))
      .length,
    followers: followStats.followers,
    following: followStats.following,
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

  const [
    shelves,
    stashItems,
    diaryEntries,
    watchlistItems,
    lists,
    ratingStats,
    followStats,
    isFollowing,
  ] = await Promise.all([
    getStashShelvesByUserId(profile.id),
    getStashTabItems(profile.id),
    getDiaryEntriesByUserId(profile.id),
    getWatchlistByUserId(profile.id),
    getListsByUserId(profile.id, viewerId),
    getUserRatingStats(profile.id),
    getProfileFollowStats(profile.id),
    viewerId && !isOwner ? checkIfFollowing(profile.id) : Promise.resolve(false),
  ]);

  const socialStats = buildSocialStats(
    diaryEntries.map((e) => e.loggedOn),
    followStats
  );

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
        shelves={shelves}
        stashItems={stashItems}
        diaryEntries={diaryEntries}
        watchlistItems={watchlistItems}
        lists={lists}
        ratingStats={ratingStats}
        socialStats={socialStats}
        isOwner={isOwner}
        isLoggedIn={Boolean(viewerId)}
        profileUserId={profile.id}
        initialIsFollowing={isFollowing}
        initialTab={initialTab}
      />
    </Suspense>
  );
}
