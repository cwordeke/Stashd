import { Suspense } from "react";
import ActivityFeedPanel from "@/components/ActivityFeedPanel";
import AuthPromptButtons from "@/components/AuthPromptButtons";
import HomeHero, { HomeHeroSkeleton } from "@/components/HomeHero";
import { ActivityFeedSkeleton } from "@/components/LoadingSkeleton";
import SpotlightShelf, {
  SpotlightShelfSkeleton,
} from "@/components/SpotlightShelf";
import { getSocialFeed } from "@/app/actions/feed";
import { getDiscoverSuggestions, getPopularThisWeek } from "@/lib/discover";
import { getHomeAuthState } from "@/lib/home-auth";
import { getHeroSlides } from "@/lib/home-hero";
import { createRequestTimer } from "@/lib/request-timing";
import { withTimeout } from "@/lib/with-timeout";
import { mediaKey, type UnifiedMediaItem } from "@/lib/types";

export const revalidate = 86400;

const FEED_TIMEOUT_MS = 8_000;
const SHELF_TIMEOUT_MS = 10_000;

async function HomeHeroSection() {
  const timer = createRequestTimer("home");
  timer.mark("hero-start");

  const [slides, auth] = await Promise.all([
    getHeroSlides(),
    getHomeAuthState(),
  ]);

  timer.mark("hero-ready", {
    slideCount: slides.length,
    signedIn: auth.signedIn,
  });

  return (
    <HomeHero
      slides={slides}
      username={auth.username}
      signedIn={auth.signedIn}
    />
  );
}

async function HomeFeed() {
  const timer = createRequestTimer("home");
  timer.mark("feed-start");

  const auth = await getHomeAuthState();
  const items = auth.signedIn
    ? await withTimeout(getSocialFeed(), FEED_TIMEOUT_MS, [])
    : [];

  timer.mark("feed-ready", {
    signedIn: auth.signedIn,
    itemCount: items.length,
  });

  return <ActivityFeedPanel initialItems={items} signedIn={auth.signedIn} />;
}

async function PopularShelf() {
  const timer = createRequestTimer("home");
  timer.mark("popular-start");

  const items = await withTimeout(
    getPopularThisWeek(),
    SHELF_TIMEOUT_MS,
    [] as UnifiedMediaItem[]
  );

  timer.mark("popular-ready", { itemCount: items.length });
  return <SpotlightShelf title="Popular This Week" items={items} />;
}

async function DiscoverShelf() {
  const timer = createRequestTimer("home");
  timer.mark("discover-shelf-start");

  const items = await withTimeout(
    getDiscoverSuggestions(),
    SHELF_TIMEOUT_MS,
    [] as UnifiedMediaItem[]
  );

  timer.mark("discover-shelf-ready", { itemCount: items.length });
  return (
    <div data-tutorial="discover">
      <SpotlightShelf
        title="Discover"
        items={items}
        emptyIllustration="popcorn"
        emptyMessage="Log, stash, or rate something and we'll suggest similar media here."
      />
    </div>
  );
}

async function FriendsLogsShelf() {
  const timer = createRequestTimer("home");
  timer.mark("friends-logs-start");

  const auth = await getHomeAuthState();
  if (!auth.signedIn) {
    timer.mark("friends-logs-anonymous");
    return (
      <SpotlightShelf
        title="Friends' Recent Logs"
        items={[]}
        emptyMessage="Sign in to see what friends are logging."
        emptyChildren={
          <AuthPromptButtons size="sm" className="justify-center" />
        }
      />
    );
  }

  const feed = await withTimeout(getSocialFeed(), FEED_TIMEOUT_MS, []);
  const seen = new Set<string>();
  const items: Array<UnifiedMediaItem & { rating?: number | null }> = [];

  for (const event of feed) {
    if (event.kind !== "log") continue;
    const key = mediaKey(event.media);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ ...event.media, rating: event.rating });
    if (items.length >= 16) break;
  }

  timer.mark("friends-logs-ready", { itemCount: items.length });

  return (
    <SpotlightShelf
      title="Friends' Recent Logs"
      items={items}
      emptyMessage="Follow people to see what they're watching, playing, and reading."
    />
  );
}

function FeedSkeleton() {
  return <ActivityFeedSkeleton />;
}

export default function HomePage() {
  createRequestTimer("home").mark("page-shell-start");

  return (
    <>
      <Suspense fallback={<HomeHeroSkeleton />}>
        <HomeHeroSection />
      </Suspense>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-10 lg:py-12">
        <div className="grid grid-cols-1 items-start gap-8 md:gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <aside
            data-tutorial="friend-activity"
            className="scrollbar-custom lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto"
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
                Friend activity
              </h2>
            </div>
            <Suspense fallback={<FeedSkeleton />}>
              <HomeFeed />
            </Suspense>
          </aside>

          <div className="space-y-8 md:space-y-10">
            <Suspense fallback={<SpotlightShelfSkeleton title="Popular This Week" />}>
              <PopularShelf />
            </Suspense>
            <Suspense fallback={<SpotlightShelfSkeleton title="Discover" />}>
              <DiscoverShelf />
            </Suspense>
            <Suspense
              fallback={<SpotlightShelfSkeleton title="Friends' Recent Logs" />}
            >
              <FriendsLogsShelf />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
