"use client";

import {
  CategoryPageSkeleton,
  HomePageSkeleton,
  MediaGridSkeleton,
  ProfilePageSkeleton,
} from "@/components/LoadingSkeleton";
import { CATEGORY_META } from "@/lib/constants";
import type { MediaType } from "@/lib/types";
import { useNavigationPending } from "@/context/NavigationPendingContext";

const HREF_TO_TYPE = Object.fromEntries(
  (Object.entries(CATEGORY_META) as [MediaType, (typeof CATEGORY_META)[MediaType]][]).map(
    ([type, meta]) => [meta.href, type]
  )
) as Record<string, MediaType>;

export function PendingRouteView() {
  const { pendingHref } = useNavigationPending();

  if (!pendingHref) return null;

  if (pendingHref === "/") {
    return <HomePageSkeleton />;
  }

  const type = HREF_TO_TYPE[pendingHref];
  if (type) {
    return <CategoryPageSkeleton type={type} />;
  }

  if (pendingHref.startsWith("/u/") || pendingHref === "/profile") {
    return <ProfilePageSkeleton />;
  }

  if (pendingHref === "/settings" || pendingHref.startsWith("/settings/")) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        <div className="space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-zinc-800" />
          <div className="h-8 w-40 animate-pulse rounded bg-zinc-800" />
          <div className="h-4 w-64 animate-pulse rounded bg-zinc-800" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-36 animate-pulse border border-white/10 bg-zinc-900/50"
          />
        ))}
      </div>
    );
  }

  if (pendingHref.startsWith("/search")) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 h-8 w-28 animate-pulse rounded bg-zinc-800" />
        <div className="mb-4 h-9 max-w-xl animate-pulse rounded-md bg-zinc-800" />
        <div className="mb-8 flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-7 w-16 animate-pulse rounded-md bg-zinc-800"
            />
          ))}
        </div>
        <MediaGridSkeleton />
      </div>
    );
  }

  return <HomePageSkeleton />;
}
