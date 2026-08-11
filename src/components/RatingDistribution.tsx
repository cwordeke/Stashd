import type { UserRatingStats } from "@/lib/ratings";
import { cn } from "@/lib/cn";

interface RatingDistributionProps {
  stats: UserRatingStats;
  className?: string;
}

/** Full-width sidebar rating histogram (Backloggd / Letterboxd style). */
export default function RatingDistribution({
  stats,
  className,
}: RatingDistributionProps) {
  const maxCount = Math.max(
    ...stats.distribution.map((bucket) => bucket.count),
    1
  );
  const averageLabel =
    stats.totalRatings === 0 ? "—" : stats.averageRating.toFixed(2);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2.5 flex items-baseline justify-between gap-2 text-[11px]">
        <p className="text-zinc-500">
          <span className="font-medium text-zinc-300">{stats.totalRatings}</span>{" "}
          {stats.totalRatings === 1 ? "rating" : "ratings"}
        </p>
        <p className="inline-flex items-center gap-1 tabular-nums text-zinc-300">
          <StarGlyph />
          {averageLabel}
        </p>
      </div>

      <div
        className="flex h-16 w-full items-end gap-[3px] border-b border-zinc-800 pb-px"
        role="img"
        aria-label={`Rating distribution. Average ${averageLabel} across ${stats.totalRatings} ratings.`}
      >
        {stats.distribution.map(({ score, count }) => {
          const heightPct =
            count === 0 ? 0 : Math.max((count / maxCount) * 100, 10);

          return (
            <div
              key={score}
              className="group relative flex h-full min-w-0 flex-1 items-end"
              title={`${formatScore(score)}★ · ${count}`}
            >
              <div
                className={cn(
                  "w-full rounded-t-[1px] transition-colors duration-150",
                  count === 0
                    ? "h-0"
                    : "bg-emerald-500 group-hover:bg-emerald-400"
                )}
                style={count === 0 ? undefined : { height: `${heightPct}%` }}
              />
              <span className="pointer-events-none absolute -top-6 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-[10px] font-medium text-zinc-200 shadow-lg group-hover:block">
                {formatScore(score)} · {count}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex w-full justify-between text-[10px] tabular-nums text-zinc-600">
        <span>½★</span>
        <span>5★</span>
      </div>
    </div>
  );
}

function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function StarGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3 text-emerald-400" aria-hidden>
      <path
        d="M12 2.5l2.9 6.1 6.7.6-5.1 4.5 1.5 6.6L12 16.9 5.9 20.3l1.5-6.6L2.4 9.2l6.7-.6L12 2.5z"
        fill="currentColor"
      />
    </svg>
  );
}
