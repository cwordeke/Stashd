import { CATEGORY_META } from "@/lib/constants";
import { MEDIA_TYPE_LABELS, MEDIA_TYPES, type MediaType } from "@/lib/types";

export function MediaCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-zinc-900/80">
      <div className="aspect-[2/3] animate-pulse bg-zinc-800" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-[80%] animate-pulse rounded bg-zinc-800" />
        <div className="h-2.5 w-[65%] animate-pulse rounded bg-zinc-800/80" />
        <div className="h-2.5 w-[30%] animate-pulse rounded bg-zinc-800/60" />
      </div>
    </div>
  );
}

export function MediaGridSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div className="media-grid-preview grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <MediaCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryPageSkeleton({
  type,
  title = "Loading…",
}: {
  type?: MediaType;
  title?: string;
}) {
  const meta = type ? CATEGORY_META[type] : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 space-y-2">
        {meta ? (
          <>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              {meta.title}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              {meta.popularHeading}
            </h1>
          </>
        ) : (
          <div className="space-y-3">
            <div className="h-3 w-20 animate-pulse rounded bg-zinc-800" />
            <div className="h-8 w-64 max-w-full animate-pulse rounded bg-zinc-800" />
            <p className="sr-only">{title}</p>
          </div>
        )}
      </header>
      <MediaGridSkeleton />
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="space-y-4">
        <div className="h-9 w-80 max-w-full animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-zinc-800/70" />
        <div className="flex flex-wrap gap-2">
          {MEDIA_TYPES.map((type) => (
            <div
              key={type}
              className="h-7 w-16 animate-pulse rounded-md bg-zinc-800"
            />
          ))}
        </div>
      </section>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="h-6 w-36 animate-pulse rounded bg-zinc-800" />
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
        </div>

        <div className="space-y-10">
          {["Popular This Week", "Discover", "Friends' Recent Logs"].map(
            (title) => (
              <section key={title} className="space-y-3">
                <div className="h-6 w-48 animate-pulse rounded bg-zinc-800" />
                <div className="flex gap-3 overflow-hidden">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="w-36 shrink-0">
                      <MediaCardSkeleton />
                    </div>
                  ))}
                </div>
              </section>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col items-center gap-3">
        <div className="h-24 w-24 animate-pulse rounded-full bg-zinc-800" />
        <div className="h-8 w-40 animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded bg-zinc-800/70" />
      </header>

      <section className="space-y-8">
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
          {(["movie", "tv", "game", "book"] as const).map((type) => (
            <div key={type} className="space-y-2.5">
              <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
              <p className="sr-only">Loading {MEDIA_TYPE_LABELS[type]}</p>
              <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                {Array.from({ length: 4 }, (_, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] animate-pulse rounded-lg bg-zinc-800"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mx-auto w-full space-y-2.5 md:max-w-[calc(50%-1rem)]">
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
          <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-lg bg-zinc-800"
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
