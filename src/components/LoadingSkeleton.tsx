import { MEDIA_TYPE_LABELS, MEDIA_TYPES } from "@/lib/types";

export function MediaCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80">
      <div className="aspect-[2/3] animate-pulse bg-zinc-800" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-[80%] animate-pulse rounded bg-zinc-800" />
        <div className="h-2.5 w-[65%] animate-pulse rounded bg-zinc-800/80" />
        <div className="h-2.5 w-[30%] animate-pulse rounded bg-zinc-800/60" />
      </div>
    </div>
  );
}

export function MediaGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <MediaCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryPageSkeleton({
  title = "Loading…",
}: {
  title?: string;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 space-y-3">
        <div className="h-3 w-20 animate-pulse rounded bg-zinc-800" />
        <div className="h-8 w-64 max-w-full animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-zinc-800/70" />
        <p className="sr-only">{title}</p>
      </header>
      <MediaGridSkeleton />
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-8 sm:px-6 sm:py-12">
      <section className="space-y-4">
        <div className="h-9 w-80 max-w-full animate-pulse rounded bg-zinc-800" />
        <div className="flex flex-wrap gap-2">
          {MEDIA_TYPES.map((type) => (
            <div
              key={type}
              className="h-7 w-16 animate-pulse rounded-full bg-zinc-800"
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-zinc-800" />
        <div className="h-40 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/40" />
      </section>

      <section className="space-y-4">
        <div className="h-6 w-52 animate-pulse rounded bg-zinc-800" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex items-start gap-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-zinc-800" />
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
          <div className="h-8 w-40 animate-pulse rounded bg-zinc-800" />
          <div className="h-4 w-64 max-w-full animate-pulse rounded bg-zinc-800/70" />
        </div>
      </header>

      <div className="space-y-10">
        {MEDIA_TYPES.map((type) => (
          <section key={type} className="space-y-3">
            <div className="h-5 w-48 animate-pulse rounded bg-zinc-800" />
            <p className="sr-only">Loading {MEDIA_TYPE_LABELS[type]}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <MediaCardSkeleton key={i} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
