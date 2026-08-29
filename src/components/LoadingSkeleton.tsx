import { CATEGORY_META } from "@/lib/constants";
import { PROFILE_TABS } from "@/lib/profile-tabs";
import { MEDIA_TYPES, type MediaType } from "@/lib/types";
import { cn } from "@/lib/cn";

/** Matte placeholder block — flat zinc, subtle opacity pulse (no shimmer). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function MediaCardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-md border border-white/10 bg-zinc-900/80">
      <Skeleton className="aspect-[2/3] w-full shrink-0 rounded-none" />
      <div className="min-h-[4.5rem] space-y-2 p-2">
        <Skeleton className="h-3 w-[80%] rounded-sm" />
        <Skeleton className="h-2.5 w-[65%] rounded-sm" />
        <Skeleton className="h-2.5 w-[30%] rounded-sm" />
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

function Top4ShelfSkeleton() {
  return (
    <div className="space-y-2.5">
      <Skeleton className="h-4 w-20 rounded-sm" />
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

export function ActivityFeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl bg-zinc-900/35 px-3.5 py-3"
        >
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 py-0.5">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-3.5 w-[85%] rounded-sm" />
          </div>
          <Skeleton className="h-[3.25rem] w-[2.2rem] shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function SearchPageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="mx-auto h-14 w-14 rounded-full sm:mx-0" />
        </div>

        <div className="flex max-w-xl gap-2">
          <Skeleton className="h-10 min-w-0 flex-1 rounded-md" />
          <Skeleton className="h-10 w-[4.5rem] shrink-0 rounded-md" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-md" />
          ))}
        </div>
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
            <Skeleton className="h-3 w-20 rounded-sm" />
            <Skeleton className="h-8 w-64 max-w-full rounded-md" />
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
      <section className="relative min-h-[300px] overflow-hidden bg-zinc-950 sm:min-h-[360px] md:min-h-[420px] lg:min-h-[460px]">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="relative mx-auto flex min-h-[inherit] max-w-7xl flex-col justify-end px-4 pb-8 pt-28 sm:px-6 md:pb-10 md:pt-32">
          <Skeleton className="h-9 w-full max-w-sm rounded-md" />
          <Skeleton className="mt-3 h-4 w-full max-w-md rounded-md" />
          <Skeleton className="mt-3 h-4 w-48 rounded-md" />
          <div className="mt-4 flex flex-wrap gap-2">
            {MEDIA_TYPES.map((type) => (
              <Skeleton key={type} className="h-7 w-16 rounded-full" />
            ))}
          </div>
          <div className="mt-5 flex gap-1.5">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-1 w-1.5 rounded-full" />
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-10 lg:py-12">
        <div className="grid grid-cols-1 items-start gap-8 md:gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Skeleton className="h-6 w-36 rounded-md" />
            <ActivityFeedSkeleton />
          </div>

          <div className="space-y-8 md:space-y-10">
            {Array.from({ length: 3 }, (_, section) => (
              <section key={section} className="space-y-3">
                <Skeleton className="h-6 w-48 max-w-full rounded-md" />
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
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex items-start gap-4 sm:gap-5">
        <Skeleton className="h-[72px] w-[72px] shrink-0 rounded-full sm:h-[88px] sm:w-[88px]" />
        <div className="min-w-0 flex-1 space-y-3 pt-0.5">
          <Skeleton className="h-8 w-36 max-w-full rounded-md sm:h-9" />
          <Skeleton className="h-4 w-28 rounded-sm" />
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Skeleton className="h-6 w-20 rounded-sm" />
            <Skeleton className="h-6 w-20 rounded-sm" />
            <Skeleton className="h-6 w-16 rounded-sm" />
          </div>
        </div>
      </header>

      <nav className="flex justify-center" aria-hidden>
        <div className="flex w-full max-w-xl items-end justify-between gap-1 border-b border-zinc-800/90 pb-3 sm:gap-8">
          {PROFILE_TABS.map((tab) => (
            <Skeleton key={tab} className="h-3 w-10 rounded-sm sm:w-12" />
          ))}
        </div>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[176px_minmax(0,1fr)] lg:gap-8">
        <aside className="space-y-5 lg:border-r lg:border-zinc-800/80 lg:pr-5">
          <section>
            <Skeleton className="h-3 w-8 rounded-sm" />
            <Skeleton className="mt-2 h-14 w-full rounded-md" />
          </section>

          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-6 w-10 rounded-sm" />
                <Skeleton className="h-2.5 w-14 rounded-sm" />
              </div>
            ))}
          </div>

          <section>
            <Skeleton className="h-3 w-28 rounded-sm" />
            <Skeleton className="mt-3 h-16 w-full rounded-md" />
            <div className="mt-1 flex justify-between">
              <Skeleton className="h-2 w-6 rounded-sm" />
              <Skeleton className="h-2 w-6 rounded-sm" />
            </div>
          </section>
        </aside>

        <div className="min-w-0 w-full space-y-8">
          <div className="grid w-full grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
            {(["movie", "tv", "game", "book"] as const).map((type) => (
              <Top4ShelfSkeleton key={type} />
            ))}
          </div>

          <div className="mx-auto w-full md:max-w-[calc(50%-1rem)]">
            <Top4ShelfSkeleton />
          </div>

          <section className="space-y-2.5">
            <Skeleton className="h-4 w-32 rounded-sm" />
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-2.5">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="aspect-[2/3] w-full rounded-md" />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28 rounded-sm" />
        <Skeleton className="h-8 w-32 rounded-md sm:h-9" />
        <Skeleton className="h-4 w-56 max-w-full rounded-sm" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10">
        <nav className="flex flex-col gap-0.5 border-r border-white/[0.06] pr-6">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </nav>

        <div className="space-y-6">
          {Array.from({ length: 3 }, (_, i) => (
            <section
              key={i}
              className="overflow-hidden border border-white/10 bg-zinc-900/50"
            >
              <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
                <Skeleton className="h-3 w-24 rounded-sm" />
              </div>
              <div className="space-y-4 px-4 py-5 sm:px-5">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-36 rounded-sm" />
                    <Skeleton className="h-3 w-48 max-w-full rounded-sm" />
                  </div>
                </div>
                <Skeleton className="h-24 w-full rounded-md" />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MediaDetailPageSkeleton() {
  return (
    <div className="pb-16">
      <Skeleton className="h-[48vw] min-h-[250px] max-h-[480px] w-full rounded-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="-mt-28 grid gap-8 sm:-mt-32 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10">
          <div className="mx-auto w-40 shrink-0 space-y-3 sm:mx-0 sm:w-44 lg:w-[180px]">
            <Skeleton className="aspect-[2/3] w-full rounded-xl" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>

          <div className="space-y-3 pt-28 sm:pt-32 lg:pt-0">
            <Skeleton className="h-3 w-20 rounded-sm" />
            <Skeleton className="h-10 w-72 max-w-full rounded-md" />
            <Skeleton className="h-4 w-48 rounded-sm" />
            <Skeleton className="h-24 w-full max-w-xl rounded-md" />
          </div>
        </div>

        <div className="mt-14 space-y-3 border-t border-white/[0.06] pt-10">
          <Skeleton className="h-3 w-28 rounded-sm" />
          <Skeleton className="h-24 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function UserListPageSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-12">
      <Skeleton className="h-4 w-32 rounded-sm" />
      <Skeleton className="mt-3 h-8 w-28 rounded-md" />
      <Skeleton className="mt-1 h-4 w-24 rounded-sm" />

      <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/40">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 last:border-b-0"
          >
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-28 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListEditPageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded-sm" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      <div className="grid gap-5 border border-white/10 bg-zinc-900/30 p-4 sm:grid-cols-2 sm:p-5">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-24 w-full rounded-md" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <Skeleton className="h-10 w-full max-w-md rounded-md" />
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-white/[0.06] py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-5 rounded-sm" />
            <Skeleton className="h-14 w-10 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48 max-w-full rounded-sm" />
              <Skeleton className="h-3 w-24 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListDetailPageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Skeleton className="h-3 w-32 rounded-sm" />

      <header className="mt-5 flex flex-col gap-5 border-b border-zinc-800 pb-6 sm:flex-row sm:items-start">
        <Skeleton className="h-24 w-52 shrink-0 rounded-md sm:h-28 sm:w-60" />
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-9 w-64 max-w-full rounded-md" />
          <Skeleton className="h-4 w-48 rounded-sm" />
          <Skeleton className="h-16 w-full max-w-xl rounded-md" />
        </div>
      </header>

      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-white/[0.06] py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-5 rounded-sm" />
            <Skeleton className="h-14 w-10 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48 max-w-full rounded-sm" />
              <Skeleton className="h-3 w-24 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
