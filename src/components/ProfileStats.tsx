import { cn } from "@/lib/cn";

export interface ProfileSocialStats {
  totalLogs: number;
  logsThisYear: number;
  /** Placeholder until follows are implemented */
  followers: number;
  /** Placeholder until follows are implemented */
  following: number;
}

interface ProfileStatsProps {
  social: ProfileSocialStats;
  className?: string;
}

/** Compact activity counters for the profile sidebar. */
export default function ProfileStats({
  social,
  className,
}: ProfileStatsProps) {
  const stats = [
    { value: social.totalLogs, label: "Logs" },
    { value: social.logsThisYear, label: "This year" },
    { value: social.following, label: "Following" },
    { value: social.followers, label: "Followers" },
  ] as const;

  return (
    <section
      className={cn("grid grid-cols-2 gap-x-3 gap-y-3", className)}
      aria-label="Profile stats"
    >
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0">
          <p className="text-xl font-semibold tabular-nums tracking-tight text-white">
            {formatCount(stat.value)}
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
            {stat.label}
          </p>
        </div>
      ))}
    </section>
  );
}

function formatCount(value: number) {
  if (value >= 10000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US").format(value);
}
