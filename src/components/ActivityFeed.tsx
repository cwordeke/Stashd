import DisplayStars from "@/components/DisplayStars";
import NavLink from "@/components/NavLink";
import type { FeedItem } from "@/app/actions/feed";
import { mediaDetailPath } from "@/lib/types";
import { cn } from "@/lib/cn";

interface ActivityFeedProps {
  items: FeedItem[];
  signedIn: boolean;
  className?: string;
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
};

export default function ActivityFeed({
  items,
  signedIn,
  className,
}: ActivityFeedProps) {
  if (!items.length) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-8 text-center",
          className
        )}
      >
        <p className="text-sm font-medium text-zinc-200">
          {signedIn ? "Your feed is quiet" : "Sign in to see friend activity"}
        </p>
        <p className="mt-1.5 text-sm text-zinc-500">
          {signedIn
            ? "Follow people from search to see what they're logging."
            : "Follow friends to fill this timeline with watches, plays, and reads."}
        </p>
      </div>
    );
  }

  return (
    <ul
      className={cn(
        "divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/40",
        className
      )}
    >
      {items.map((item) => (
        <li key={item.id} className="px-3 py-3.5 sm:px-4">
          {item.kind === "log" ? (
            <LogRow item={item} />
          ) : (
            <FollowRow item={item} />
          )}
        </li>
      ))}
    </ul>
  );
}

function LogRow({ item }: { item: Extract<FeedItem, { kind: "log" }> }) {
  const href = mediaDetailPath(item.media.mediaType, item.media.id);

  return (
    <div className="flex items-start gap-3">
      <UserAvatar username={item.actor.username} avatarUrl={item.actor.avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-zinc-200">
          <UsernameLink username={item.actor.username} />{" "}
          <span className="text-zinc-400">{item.verb}</span>{" "}
          <NavLink
            href={href}
            className="font-medium text-zinc-100 transition hover:text-emerald-400"
          >
            {item.media.title}
          </NavLink>
        </p>
        {item.rating != null ? (
          <div className="mt-1.5">
            <DisplayStars rating={item.rating} />
          </div>
        ) : null}
        <time className="mt-1.5 block text-xs text-zinc-600" dateTime={item.createdAt}>
          {formatFeedDate(item.createdAt)}
        </time>
      </div>
    </div>
  );
}

function FollowRow({ item }: { item: Extract<FeedItem, { kind: "follow" }> }) {
  return (
    <div className="flex items-start gap-3">
      <UserAvatar username={item.actor.username} avatarUrl={item.actor.avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-zinc-200">
          <UsernameLink username={item.actor.username} />{" "}
          <span className="text-zinc-400">followed</span>{" "}
          <UsernameLink username={item.target.username} />
        </p>
        <time className="mt-1.5 block text-xs text-zinc-600" dateTime={item.createdAt}>
          {formatFeedDate(item.createdAt)}
        </time>
      </div>
    </div>
  );
}

function UsernameLink({ username }: { username: string }) {
  return (
    <NavLink
      href={`/u/${username}`}
      className="font-medium text-emerald-400/90 transition hover:text-emerald-300"
    >
      @{username}
    </NavLink>
  );
}

function UserAvatar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote avatars vary by host
      <img
        src={avatarUrl}
        alt=""
        width={36}
        height={36}
        className="mt-0.5 h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white"
      aria-hidden
    >
      {username.charAt(0).toUpperCase()}
    </span>
  );
}

function formatFeedDate(value: string): string {
  const dateOnly = value.slice(0, 10);
  const parts = dateOnly.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  const date =
    year && month && day
      ? new Date(year, month - 1, day)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", DATE_FORMAT).format(date);
}
