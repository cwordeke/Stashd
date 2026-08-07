import { CATEGORY_META } from "@/lib/constants";
import { getTrendingForType } from "@/lib/trending";
import type { MediaType } from "@/lib/types";
import MediaGrid from "@/components/MediaGrid";

interface CategoryPageProps {
  type: MediaType;
}

export default async function CategoryPage({ type }: CategoryPageProps) {
  const meta = CATEGORY_META[type];
  const { results, source } = await getTrendingForType(type);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-500/80">
          {meta.title}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          {meta.popularHeading}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          {meta.description}
          {source === "placeholder" ? (
            <span className="ml-1 text-amber-400/90">
              Unable to load trending items at this time.
            </span>
          ) : null}
        </p>
      </header>

      <MediaGrid items={results} />
    </div>
  );
}
