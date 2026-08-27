import { Suspense } from "react";
import ActivityFeedPanel from "@/components/ActivityFeedPanel";
import NavLink from "@/components/NavLink";
import SpotlightShelf, {
  SpotlightShelfSkeleton,
} from "@/components/SpotlightShelf";
import { getSocialFeed } from "@/app/actions/feed";
import { CATEGORY_META } from "@/lib/constants";
import { getDiscoverSuggestions, getPopularThisWeek } from "@/lib/discover";
import { getOwnProfile } from "@/lib/profile";
import { MEDIA_TYPES, mediaKey, type UnifiedMediaItem } from "@/lib/types";

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
      emptyMessage="Log, stash, or rate something and we'll suggest similar media here."
    />
  );
}

function FeedSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 border-b border-white/[0.06] px-4 py-3.5 last:border-b-0"
        >
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-zinc-800" />
          <div className="min-w-0 flex-1 space-y-2 py-0.5">
            <div className="h-3.5 w-[85%] animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-40 animate-pulse rounded bg-zinc-800/70" />
          </div>
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="space-y-4">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {username ? (
            <>Welcome back, {username}</>
          ) : (
            <>Welcome to Stashd</>
          )}
        </h1>
        <p className="max-w-xl text-sm text-zinc-400">
          {signedIn
            ? "See what friends are logging, plus picks based on what you like."
            : "Track movies, TV, games, books, and music — then follow friends to fill your feed."}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {MEDIA_TYPES.map((type) => (
            <NavLink
              key={type}
              href={CATEGORY_META[type].href}
              className="rounded-md border border-white/10 px-2.5 py-1 text-[13px] text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
            >
              {CATEGORY_META[type].title}
            </NavLink>
          ))}
        </div>
      </section>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:[scrollbar-width:thin]">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
              Friend activity
            </h2>
          </div>
          <Suspense fallback={<FeedSkeleton />}>
            <HomeFeed signedIn={signedIn} />
          </Suspense>
        </aside>

        <div className="space-y-10">
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
  );
}
