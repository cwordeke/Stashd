import NavLink from "@/components/NavLink";
import { cn } from "@/lib/cn";

export interface ProfileSocialStats {
  totalLogs: number;
  logsThisYear: number;
  followers: number;
  following: number;
}

interface ProfileStatsProps {
  username: string;
  social: ProfileSocialStats;
  className?: string;
}

/** Compact activity counters for the profile sidebar. */
export default function ProfileStats({
  username,
  social,
  className,
}: ProfileStatsProps) {
  const stats = [
    { value: social.totalLogs, label: "Logs" },
    { value: social.logsThisYear, label: "This year" },
    {
      value: social.following,
      label: "Following",
      href: `/u/${username}/following`,
    },
    {
      value: social.followers,
      label: "Followers",
      href: `/u/${username}/followers`,
    },
  ] as const;

  return (
    <section
      className={cn("grid grid-cols-2 gap-x-3 gap-y-3", className)}
      aria-label="Profile stats"
    >
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0">
          {"href" in stat && stat.href ? (
            <NavLink
              href={stat.href}
              className="group block rounded-sm transition hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            >
              <p className="text-lg font-semibold tabular-nums tracking-tight text-white group-hover:text-emerald-300">
                {formatCount(stat.value)}
              </p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500 group-hover:text-emerald-400/80">
                {stat.label}
              </p>
            </NavLink>
          ) : (
            <>
              <p className="text-lg font-semibold tabular-nums tracking-tight text-white">
                {formatCount(stat.value)}
              </p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                {stat.label}
              </p>
            </>
          )}
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
