"use client";

import {
  CategoryPageSkeleton,
  HomePageSkeleton,
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

  return <HomePageSkeleton />;
}
