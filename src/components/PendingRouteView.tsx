"use client";

import {
  CategoryPageSkeleton,
  HomePageSkeleton,
  ListDetailPageSkeleton,
  ListEditPageSkeleton,
  MediaDetailPageSkeleton,
  ProfilePageSkeleton,
  SearchPageSkeleton,
  SettingsPageSkeleton,
  UserListPageSkeleton,
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

  if (pendingHref === "/profile" || /^\/u\/[^/]+$/.test(pendingHref)) {
    return <ProfilePageSkeleton />;
  }

  if (pendingHref === "/settings" || pendingHref.startsWith("/settings/")) {
    return <SettingsPageSkeleton />;
  }

  if (pendingHref.startsWith("/search")) {
    return <SearchPageSkeleton />;
  }

  if (/\/followers$/.test(pendingHref) || /\/following$/.test(pendingHref)) {
    return <UserListPageSkeleton />;
  }

  if (/\/lists\/[^/]+$/.test(pendingHref) && pendingHref.startsWith("/u/")) {
    return <ListDetailPageSkeleton />;
  }

  if (
    (/\/lists\/[^/]+\/edit$/.test(pendingHref) ||
      /\/lists\/new$/.test(pendingHref)) &&
    pendingHref.startsWith("/u/")
  ) {
    return <ListEditPageSkeleton />;
  }

  if (pendingHref.startsWith("/media/")) {
    return <MediaDetailPageSkeleton />;
  }

  return <HomePageSkeleton />;
}
