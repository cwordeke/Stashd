import { Suspense } from "react";
import { CATEGORY_META } from "@/lib/constants";
import { getTrendingForType } from "@/lib/trending";
import type { MediaType } from "@/lib/types";
import MediaGrid from "@/components/MediaGrid";
import { MediaGridSkeleton } from "@/components/LoadingSkeleton";

interface CategoryPageProps {
  type: MediaType;
}

async function CategoryResults({ type }: { type: MediaType }) {
  const { results, source } = await getTrendingForType(type);

  return (
    <div className="space-y-4">
      {source === "placeholder" ? (
        <p className="text-sm text-amber-400/90">
          Unable to load trending items at this time.
        </p>
      ) : null}
      <MediaGrid items={results} showAddButton />
    </div>
  );
}

export default function CategoryPage({ type }: CategoryPageProps) {
  const meta = CATEGORY_META[type];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-500/80">
          {meta.title}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          {meta.popularHeading}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">{meta.description}</p>
      </header>

      <Suspense fallback={<MediaGridSkeleton />}>
        <CategoryResults type={type} />
      </Suspense>
    </div>
  );
}
