import type { ReactNode } from "react";
import DisplayStars from "@/components/DisplayStars";
import EmptyState from "@/components/EmptyState";
import NavLink from "@/components/NavLink";
import type { FeedItem } from "@/app/actions/feed";
import { formatRelativeTime } from "@/lib/relative-time";
import { mediaDetailPath } from "@/lib/types";
import { cn } from "@/lib/cn";

interface ActivityFeedProps {
  items: FeedItem[];
  signedIn: boolean;
  className?: string;
}

export default function ActivityFeed({
  items,
  signedIn,
  className,
}: ActivityFeedProps) {
  if (!items.length) {
    return (
      <EmptyState
        illustration="no-notifications"
        title={
          signedIn ? "No notifications right now" : "Sign in to see friend activity"
        }
        description={
          signedIn
            ? "Follow people from search to see what they're logging."
            : "Follow friends to fill this timeline with watches, plays, and reads."
        }
        className={cn("rounded-xl bg-zinc-900/40", className)}
      />
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
          ) : item.kind === "follow" ? (
            <FollowRow item={item} />
          ) : item.kind === "rate" ? (
            <RateRow item={item} />
          ) : item.kind === "stash" ? (
            <StashRow item={item} />
          ) : (
            <ListRow item={item} />
          )}
        </li>
      ))}
    </ul>
  );
}

function LogRow({ item }: { item: Extract<FeedItem, { kind: "log" }> }) {
  const href = mediaDetailPath(item.media.mediaType, item.media.id);

  return (
    <FeedRowShell actor={item.actor}>
      <p className="text-sm leading-snug text-zinc-200">
        <UsernameLink username={item.actor.username} />{" "}
        <span className="text-zinc-400">{item.verb.toLowerCase()}</span>{" "}
        <MediaLink href={href} title={item.media.title} />
      </p>
      {item.rating != null ? (
        <div className="mt-1.5">
          <DisplayStars rating={item.rating} />
        </div>
      ) : null}
      {item.reviewText ? (
        <p className="mt-1.5 line-clamp-2 text-sm text-zinc-400">
          {item.reviewText}
        </p>
      ) : null}
      <FeedTime createdAt={item.createdAt} />
    </FeedRowShell>
  );
}

function RateRow({ item }: { item: Extract<FeedItem, { kind: "rate" }> }) {
  const href = mediaDetailPath(item.media.mediaType, item.media.id);

  return (
    <FeedRowShell actor={item.actor}>
      <p className="text-sm leading-snug text-zinc-200">
        <UsernameLink username={item.actor.username} />{" "}
        <span className="text-zinc-400">rated</span>{" "}
        <MediaLink href={href} title={item.media.title} />
      </p>
      <div className="mt-1.5">
        <DisplayStars rating={item.rating} />
      </div>
      <FeedTime createdAt={item.createdAt} />
    </FeedRowShell>
  );
}

function StashRow({ item }: { item: Extract<FeedItem, { kind: "stash" }> }) {
  const href = mediaDetailPath(item.media.mediaType, item.media.id);

  return (
    <FeedRowShell actor={item.actor}>
      <p className="text-sm leading-snug text-zinc-200">
        <UsernameLink username={item.actor.username} />{" "}
        <span className="text-zinc-400">stashed</span>{" "}
        <MediaLink href={href} title={item.media.title} />
      </p>
      <FeedTime createdAt={item.createdAt} />
    </FeedRowShell>
  );
}

function ListRow({ item }: { item: Extract<FeedItem, { kind: "list" }> }) {
  const mediaHref = mediaDetailPath(item.media.mediaType, item.media.id);
  const listHref = `/u/${item.actor.username}/lists/${item.list.id}`;

  return (
    <FeedRowShell actor={item.actor}>
      <p className="text-sm leading-snug text-zinc-200">
        <UsernameLink username={item.actor.username} />{" "}
        <span className="text-zinc-400">added</span>{" "}
        <MediaLink href={mediaHref} title={item.media.title} />{" "}
        <span className="text-zinc-400">to</span>{" "}
        <NavLink
          href={listHref}
          className="font-medium text-zinc-100 transition hover:text-emerald-400"
        >
          {item.list.name}
        </NavLink>
      </p>
      <FeedTime createdAt={item.createdAt} />
    </FeedRowShell>
  );
}

function FollowRow({ item }: { item: Extract<FeedItem, { kind: "follow" }> }) {
  return (
    <FeedRowShell actor={item.actor}>
      <p className="text-sm leading-snug text-zinc-200">
        <UsernameLink username={item.actor.username} />{" "}
        <span className="text-zinc-400">followed</span>{" "}
        <UsernameLink username={item.target.username} />
      </p>
      <FeedTime createdAt={item.createdAt} />
    </FeedRowShell>
  );
}

function FeedRowShell({
  actor,
  children,
}: {
  actor: { username: string; avatarUrl: string | null };
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <UserAvatar username={actor.username} avatarUrl={actor.avatarUrl} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function MediaLink({ href, title }: { href: string; title: string }) {
  return (
    <NavLink
      href={href}
      className="font-medium text-zinc-100 transition hover:text-emerald-400"
    >
      {title}
    </NavLink>
  );
}

function FeedTime({ createdAt }: { createdAt: string }) {
  return (
    <time
      className="mt-1.5 block text-xs text-zinc-600"
      dateTime={createdAt}
      title={createdAt}
    >
      {formatRelativeTime(createdAt)}
    </time>
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
