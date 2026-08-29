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
import { getHeroSlides } from "@/lib/home-hero";
import { getOwnProfile } from "@/lib/profile";
import { mediaKey, type UnifiedMediaItem } from "@/lib/types";

export const revalidate = 86400;

async function HomeFeed({ signedIn }: { signedIn: boolean }) {
  const items = signedIn ? await getSocialFeed() : [];
  return <ActivityFeedPanel initialItems={items} signedIn={signedIn} />;
}

async function PopularShelf() {
  const items = await getPopularThisWeek();
  return <SpotlightShelf title="Popular This Week" items={items} />;
}

async function FriendsLogsShelf({ signedIn }: { signedIn: boolean }) {
  if (!signedIn) {
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

  const feed = await getSocialFeed();
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

  return (
    <SpotlightShelf
      title="Friends' Recent Logs"
      items={items}
      emptyMessage="Follow people to see what they're watching, playing, and reading."
    />
  );
}

async function DiscoverShelf() {
  const items = await getDiscoverSuggestions();
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

async function HomeHeroSection({
  username,
  signedIn,
}: {
  username?: string;
  signedIn: boolean;
}) {
  const slides = await getHeroSlides();
  return <HomeHero slides={slides} username={username} signedIn={signedIn} />;
}

function FeedSkeleton() {
  return <ActivityFeedSkeleton />;
}

export default async function HomePage() {
  const profile = await getOwnProfile();
  const username = profile?.username;
  const signedIn = Boolean(profile);

  return (
    <>
      <Suspense fallback={<HomeHeroSkeleton />}>
        <HomeHeroSection username={username} signedIn={signedIn} />
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
              <HomeFeed signedIn={signedIn} />
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
              <FriendsLogsShelf signedIn={signedIn} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
