export default function Loading() {
  return (
    <div className="pb-16">
      <div className="h-[280px] w-full animate-pulse bg-zinc-900 sm:h-[400px]" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="-mt-28 grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)]">
          <div className="mx-auto w-40 space-y-3 sm:mx-0 sm:w-44 lg:w-[180px]">
            <div className="aspect-[2/3] animate-pulse rounded-xl bg-zinc-800" />
            <div className="h-8 animate-pulse rounded bg-zinc-800/80" />
            <div className="h-16 animate-pulse rounded-lg bg-zinc-800/70" />
            <div className="h-10 animate-pulse rounded-xl bg-zinc-800" />
          </div>
          <div className="space-y-3 pt-28">
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
            <div className="h-10 w-72 max-w-full animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-48 animate-pulse rounded bg-zinc-800/80" />
            <div className="h-24 w-full max-w-xl animate-pulse rounded bg-zinc-800/60" />
          </div>
        </div>
        <div className="mt-14 space-y-3 border-t border-white/[0.06] pt-10">
          <div className="h-3 w-28 animate-pulse rounded bg-zinc-800" />
          <div className="h-24 w-full animate-pulse rounded bg-zinc-800/50" />
        </div>
      </div>
    </div>
  );
}
