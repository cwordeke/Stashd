import { Suspense } from "react";
import ActivityFeedPanel from "@/components/ActivityFeedPanel";
import HomeHero, { HomeHeroSkeleton } from "@/components/HomeHero";
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
    <SpotlightShelf
      title="Discover"
      items={items}
      emptyIllustration="popcorn"
      emptyMessage="Log, stash, or rate something and we'll suggest similar media here."
    />
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
  return (
    <div className="space-y-1.5">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl bg-zinc-900/35 px-3.5 py-3"
        >
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-zinc-800" />
          <div className="min-w-0 flex-1 space-y-2 py-0.5">
            <div className="h-4 w-16 animate-pulse rounded-full bg-zinc-800/70" />
            <div className="h-3.5 w-[85%] animate-pulse rounded bg-zinc-800" />
          </div>
          <div className="h-[3.25rem] w-[2.2rem] shrink-0 animate-pulse rounded-md bg-zinc-800" />
        </div>
      ))}
    </div>
  );
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
          <aside className="scrollbar-custom lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
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
