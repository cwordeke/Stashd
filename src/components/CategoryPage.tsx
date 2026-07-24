import { CATEGORY_META } from "@/lib/constants";
import { getPopularForType } from "@/lib/popular";
import type { MediaType } from "@/lib/types";
import MediaGrid from "@/components/MediaGrid";

interface CategoryPageProps {
  type: MediaType;
}

export default async function CategoryPage({ type }: CategoryPageProps) {
  const meta = CATEGORY_META[type];
  const { results, source } = await getPopularForType(type);

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
          Browse what&apos;s trending in {meta.title.toLowerCase()}. Add favorites
          to your Top 4 stash from any card or via Search.
          {source === "placeholder" ? (
            <span className="ml-1 text-amber-400/90">
              Showing placeholders — configure API keys for live data.
            </span>
          ) : null}
        </p>
      </header>

      <MediaGrid items={results} />
    </div>
  );
}
