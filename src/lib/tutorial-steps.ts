import type { ProfileTab } from "@/lib/profile-tabs";

export type TutorialPlacement = "top" | "bottom" | "left" | "right";

export interface TutorialStep {
  target?: string;
  targetDesktop?: string;
  targetMobile?: string;
  fallbackTarget?: string;
  title: string;
  body: string;
  placement: TutorialPlacement;
  placementDesktop?: TutorialPlacement;
  placementMobile?: TutorialPlacement;
  tooltipAnchor?: "target" | "center-right";
  profileTab?: ProfileTab;
  profileGate?: boolean;
}

/** Step index for "where is your profile" (step 4 of 8 in the UI). */
export const PROFILE_GATE_STEP_INDEX = 3;

/** First step shown on the profile page after the gate. */
export const PROFILE_START_STEP_INDEX = 4;

export function profilePathname(username: string): string {
  return `/u/${username}`;
}

export function isOnProfile(pathname: string, username: string): boolean {
  const base = profilePathname(username);
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function readProfileTab(
  searchParams: URLSearchParams | null
): ProfileTab {
  const tab = searchParams?.get("tab");
  if (tab === "stash" || tab === "diary" || tab === "watchlist" || tab === "lists") {
    return tab;
  }
  return "top4";
}

export const TUTORIAL_STEPS: TutorialStep[] = [
    {
      target: '[data-tutorial="hero-categories"]',
      title: "Browse by category",
      body: "Movies, TV, games, books, and music. All in one place.",
      placement: "bottom",
    },
    {
      target: '[data-tutorial="friend-activity"]',
      title: "Friend activity",
      body: "Follow friends to see their logs, ratings, and reviews here.",
      placement: "right",
    },
    {
      target: '[data-tutorial="discover"]',
      title: "Discover",
      body: "Log and rate media to get personalized recommendations.",
      placement: "top",
    },
    {
      target: '[data-tutorial="profile-link"]',
      title: "Your profile",
      body: "Open your profile from the top right on desktop, or the Profile tab on mobile. We'll walk you through it when you get there.",
      placement: "bottom",
      tooltipAnchor: "center-right",
      profileGate: true,
    },
    {
      target: '[data-tutorial="profile-top4-add"]',
      fallbackTarget: '[data-tutorial="profile-top4"]',
      title: "Add to Top 4",
      body: "Tap + to add favorites from what you've logged. Pick up to four per category.",
      placement: "bottom",
      profileTab: "top4",
    },
    {
      target: '[data-tutorial="profile-top4-grid"]',
      fallbackTarget: '[data-tutorial="profile-top4"]',
      title: "Drag to reorder",
      body: "Hold and drag posters to rearrange your Top 4.",
      placement: "top",
      profileTab: "top4",
    },
    {
      target: '[data-tutorial="profile-stash"]',
      title: "Your stash",
      body: "Everything you've rated, liked, or logged shows up here.",
      placement: "top",
      profileTab: "stash",
    },
    {
      target: '[data-tutorial="profile-diary"]',
      title: "Your diary",
      body: "A chronological log of everything you've watched, played, and read.",
      placement: "top",
      profileTab: "diary",
    },
  ];
