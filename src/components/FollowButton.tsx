"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollow } from "@/app/actions/social";
import ProfileSettings from "@/components/ProfileSettings";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/cn";
import type { UserRatingStats } from "@/lib/ratings";

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing: boolean;
  className?: string;
}

export default function FollowButton({
  targetUserId,
  initialIsFollowing,
  className,
}: FollowButtonProps) {
  const { button } = useFollowToggle(targetUserId, initialIsFollowing, 0);
  return <span className={className}>{button}</span>;
}

interface ProfileIdentityHeaderProps {
  username: string;
  profileUserId: string;
  isOwner: boolean;
  isLoggedIn: boolean;
  initialIsFollowing: boolean;
  followers: number;
  following: number;
  ratingStats: UserRatingStats;
}

export function ProfileIdentityHeader({
  username,
  profileUserId,
  isOwner,
  isLoggedIn,
  initialIsFollowing,
  followers,
  following,
  ratingStats,
}: ProfileIdentityHeaderProps) {
  const { button, optimisticFollowers } = useFollowToggle(
    profileUserId,
    initialIsFollowing,
    followers
  );

  return (
    <div className="min-w-0 flex-1 pt-0.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {username}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">@{username}</p>
        </div>
        {isOwner ? (
          <ProfileSettings username={username} className="shrink-0" />
        ) : isLoggedIn ? (
          button
        ) : null}
      </div>

      <dl className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <HeaderStat
          value={isLoggedIn && !isOwner ? optimisticFollowers : followers}
          label="Followers"
        />
        <HeaderStat value={following} label="Following" />
        <div className="flex items-baseline gap-1.5">
          <dt className="sr-only">Rating average</dt>
          <dd className="inline-flex items-center gap-1 text-lg font-semibold tabular-nums tracking-tight text-white">
            <StarGlyph />
            {ratingStats.totalRatings === 0
              ? "—"
              : ratingStats.averageRating.toFixed(2)}
          </dd>
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
            Average
          </span>
        </div>
      </dl>
    </div>
  );
}

function useFollowToggle(
  targetUserId: string,
  initialIsFollowing: boolean,
  initialFollowers: number
) {
  const router = useRouter();
  const { showToast } = useToast();
  const [, startTransition] = useTransition();
  const [state, setState] = useState({
    isFollowing: initialIsFollowing,
    followers: initialFollowers,
  });
  const [optimistic, setOptimistic] = useOptimistic(
    state,
    (current, nextFollowing: boolean) => ({
      isFollowing: nextFollowing,
      followers: current.followers + (nextFollowing ? 1 : -1),
    })
  );

  useEffect(() => {
    setState({
      isFollowing: initialIsFollowing,
      followers: initialFollowers,
    });
  }, [initialIsFollowing, initialFollowers]);

  function handleToggle() {
    const next = !optimistic.isFollowing;
    startTransition(async () => {
      setOptimistic(next);
      const result = await toggleFollow(targetUserId, !next);

      if (!result.ok) {
        showToast(result.message, "error");
        return;
      }

      setState((prev) => ({
        isFollowing: result.isFollowing,
        followers: prev.followers + (result.isFollowing ? 1 : -1),
      }));
      router.refresh();
    });
  }

  const button = (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={optimistic.isFollowing}
      className={cn(
        "shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
        optimistic.isFollowing
          ? "border border-zinc-700 bg-transparent text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800"
          : "bg-emerald-600 text-white hover:bg-emerald-500"
      )}
    >
      {optimistic.isFollowing ? "Unfollow" : "Follow"}
    </button>
  );

  return {
    button,
    optimisticFollowing: optimistic.isFollowing,
    optimisticFollowers: Math.max(0, optimistic.followers),
  };
}

function HeaderStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="sr-only">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums tracking-tight text-white">
        {formatCount(value)}
      </dd>
      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </span>
    </div>
  );
}

function formatCount(value: number) {
  if (value >= 10000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US").format(value);
}

function StarGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-emerald-400" aria-hidden>
      <path
        d="M12 2.5l2.9 6.1 6.7.6-5.1 4.5 1.5 6.6L12 16.9 5.9 20.3l1.5-6.6L2.4 9.2l6.7-.6L12 2.5z"
        fill="currentColor"
      />
    </svg>
  );
}
