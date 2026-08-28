import { CATEGORY_META } from "@/lib/constants";
import { MEDIA_TYPE_LABELS, MEDIA_TYPES, type MediaType } from "@/lib/types";

export function MediaCardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-md border border-white/10 bg-zinc-900/80">
      <div className="aspect-[2/3] shrink-0 animate-pulse bg-zinc-800" />
      <div className="min-h-[4.5rem] space-y-2 p-2">
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

export function SearchPageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 h-8 w-28 animate-pulse rounded bg-zinc-800" />
      <div className="mb-4 h-9 max-w-xl animate-pulse rounded-md bg-zinc-800" />
      <div className="mb-8 flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-16 animate-pulse rounded-md bg-zinc-800"
          />
        ))}
      </div>
      <MediaGridSkeleton />
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
    <>
      <section className="relative min-h-[300px] overflow-hidden bg-zinc-900 sm:min-h-[360px] md:min-h-[420px] lg:min-h-[460px]">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-800/50 via-zinc-900 to-zinc-950" />
        <div className="relative mx-auto flex min-h-[inherit] max-w-7xl flex-col justify-end px-4 pb-8 pt-28 sm:px-6 md:pb-10 md:pt-32">
          <div className="h-9 w-full max-w-sm animate-pulse rounded bg-zinc-800/80" />
          <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-zinc-800/60" />
          <div className="mt-4 flex flex-wrap gap-2">
            {MEDIA_TYPES.map((type) => (
              <div
                key={type}
                className="h-7 w-16 animate-pulse rounded-full bg-zinc-800/60"
              />
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-10 lg:py-12">
        <div className="grid grid-cols-1 items-start gap-8 md:gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="h-6 w-36 animate-pulse rounded bg-zinc-800" />
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
          </div>

          <div className="space-y-8 md:space-y-10">
            {["Popular This Week", "Discover", "Friends' Recent Logs"].map(
              (title) => (
                <section key={title} className="space-y-3">
                  <div className="h-6 w-48 max-w-full animate-pulse rounded bg-zinc-800" />
                  <div className="-mx-4 flex items-stretch gap-3 overflow-x-auto px-4 scrollbar-hide sm:-mx-0 sm:px-0">
                    {Array.from({ length: 6 }, (_, i) => (
                      <div
                        key={i}
                        className="flex w-[8.5rem] shrink-0 snap-start sm:w-36"
                      >
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
    </>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col items-center gap-3">
        <div className="h-24 w-24 rounded-full shader-pulse" />
        <div className="h-8 w-40 shader-pulse" />
        <div className="h-4 w-64 max-w-full shader-pulse" />
      </header>

      <section className="space-y-8">
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
          {(["movie", "tv", "game", "book"] as const).map((type) => (
            <div key={type} className="space-y-2.5">
              <div className="h-4 w-20 shader-pulse" />
              <p className="sr-only">Loading {MEDIA_TYPE_LABELS[type]}</p>
              <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="aspect-[2/3] shader-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mx-auto w-full space-y-2.5 md:max-w-[calc(50%-1rem)]">
          <div className="h-4 w-24 shader-pulse" />
          <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="aspect-[2/3] shader-pulse" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
