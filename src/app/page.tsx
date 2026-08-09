import { Suspense } from "react";
import MediaCard from "@/components/MediaCard";
import NavLink from "@/components/NavLink";
import { MediaCardSkeleton } from "@/components/LoadingSkeleton";
import { CATEGORY_META } from "@/lib/constants";
import { getOwnProfile } from "@/lib/profile";
import { getTrendingForType } from "@/lib/trending";
import { MEDIA_TYPES, type UnifiedMediaItem } from "@/lib/types";

export const revalidate = 86400;

const ACTIVITY = [
  {
    id: "1",
    text: "You rated Blade Runner 2049 ★★★★½",
    time: "2h ago",
    medium: "Movies",
  },
  {
    id: "2",
    text: "Added Elden Ring to Top 4 Games",
    time: "Yesterday",
    medium: "Games",
  },
  {
    id: "3",
    text: "Finished reading Neuromancer",
    time: "3d ago",
    medium: "Books",
  },
  {
    id: "4",
    text: "Logged Random Access Memories",
    time: "5d ago",
    medium: "Music",
  },
];

async function loadSpotlight(): Promise<UnifiedMediaItem[]> {
  const picks = await Promise.all(
    MEDIA_TYPES.map(async (type) => {
      const { results } = await getTrendingForType(type);
      return results[0] ?? null;
    })
  );

  return picks.filter((item): item is UnifiedMediaItem => item !== null);
}

async function SpotlightGrid() {
  const spotlight = await loadSpotlight();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {spotlight.map((item) => (
        <MediaCard key={`${item.mediaType}-${item.id}`} item={item} />
      ))}
    </div>
  );
}

function SpotlightFallback() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {Array.from({ length: 5 }, (_, i) => (
        <MediaCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default async function HomePage() {
  const profile = await getOwnProfile();
  const username = profile?.username;

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-8 sm:px-6 sm:py-12">
      <section className="space-y-4">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {username ? (
            <>
              Welcome back,{" "}
              <span className="text-emerald-400">{username},</span> here&apos;s
              what&apos;s new...
            </>
          ) : (
            <>Welcome — here&apos;s what&apos;s new...</>
          )}
        </h1>
        <div className="flex flex-wrap gap-2 pt-1">
          {MEDIA_TYPES.map((type) => (
            <NavLink
              key={type}
              href={CATEGORY_META[type].href}
              className="rounded-full border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-emerald-600/50 hover:text-white"
            >
              {CATEGORY_META[type].title}
            </NavLink>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-semibold text-zinc-100">
            Recent Activity
          </h2>
          <span className="text-xs text-zinc-500">Placeholder feed</span>
        </div>
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          {ACTIVITY.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-4 px-4 py-3.5 sm:px-5"
            >
              <div>
                <p className="text-sm text-zinc-200">{item.text}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{item.medium}</p>
              </div>
              <time className="shrink-0 text-xs text-zinc-600">{item.time}</time>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-semibold text-zinc-100">
            Cross-Media Spotlight
          </h2>
          <span className="text-xs text-zinc-500">One from each medium</span>
        </div>
        <Suspense fallback={<SpotlightFallback />}>
          <SpotlightGrid />
        </Suspense>
      </section>
    </div>
  );
}
