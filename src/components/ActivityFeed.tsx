import type { ReactNode } from "react";
import Image from "next/image";
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
        className={cn("rounded-xl bg-zinc-900/30 py-8", className)}
      />
    );
  }

  return (
    <ul className={cn("space-y-1.5", className)}>
      {items.map((item) => (
        <li key={item.id}>
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

function FeedCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-zinc-900/35 px-3 py-3 transition-colors hover:bg-zinc-900/55 sm:px-3.5">
      {children}
    </div>
  );
}

function LogRow({ item }: { item: Extract<FeedItem, { kind: "log" }> }) {
  const href = mediaDetailPath(item.media.mediaType, item.media.id);

  return (
    <FeedCard>
      <FeedRowShell
        actor={item.actor}
        media={item.media}
        mediaHref={href}
        action={
          <ActionBadge tone="log">{item.verb.toLowerCase()}</ActionBadge>
        }
        time={item.createdAt}
      >
        <p className="text-sm leading-snug text-zinc-300">
          <UsernameLink username={item.actor.username} />{" "}
          <span className="text-zinc-500">{item.verb.toLowerCase()}</span>{" "}
          <MediaLink href={href} title={item.media.title} />
        </p>
        {item.rating != null ? (
          <div className="mt-1.5">
            <DisplayStars rating={item.rating} />
          </div>
        ) : null}
        {item.reviewText ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-zinc-500">
            &ldquo;{item.reviewText}&rdquo;
          </p>
        ) : null}
      </FeedRowShell>
    </FeedCard>
  );
}

function RateRow({ item }: { item: Extract<FeedItem, { kind: "rate" }> }) {
  const href = mediaDetailPath(item.media.mediaType, item.media.id);

  return (
    <FeedCard>
      <FeedRowShell
        actor={item.actor}
        media={item.media}
        mediaHref={href}
        action={<ActionBadge tone="rate">rated</ActionBadge>}
        time={item.createdAt}
      >
        <p className="text-sm leading-snug text-zinc-300">
          <UsernameLink username={item.actor.username} />{" "}
          <span className="text-zinc-500">rated</span>{" "}
          <MediaLink href={href} title={item.media.title} />
        </p>
        <div className="mt-1.5">
          <DisplayStars rating={item.rating} />
        </div>
      </FeedRowShell>
    </FeedCard>
  );
}

function StashRow({ item }: { item: Extract<FeedItem, { kind: "stash" }> }) {
  const href = mediaDetailPath(item.media.mediaType, item.media.id);

  return (
    <FeedCard>
      <FeedRowShell
        actor={item.actor}
        media={item.media}
        mediaHref={href}
        action={<ActionBadge tone="stash">stashed</ActionBadge>}
        time={item.createdAt}
      >
        <p className="text-sm leading-snug text-zinc-300">
          <UsernameLink username={item.actor.username} />{" "}
          <span className="text-zinc-500">stashed</span>{" "}
          <MediaLink href={href} title={item.media.title} />
        </p>
      </FeedRowShell>
    </FeedCard>
  );
}

function ListRow({ item }: { item: Extract<FeedItem, { kind: "list" }> }) {
  const mediaHref = mediaDetailPath(item.media.mediaType, item.media.id);
  const listHref = `/u/${item.actor.username}/lists/${item.list.id}`;

  return (
    <FeedCard>
      <FeedRowShell
        actor={item.actor}
        media={item.media}
        mediaHref={mediaHref}
        action={<ActionBadge tone="list">listed</ActionBadge>}
        time={item.createdAt}
      >
        <p className="text-sm leading-snug text-zinc-300">
          <UsernameLink username={item.actor.username} />{" "}
          <span className="text-zinc-500">added</span>{" "}
          <MediaLink href={mediaHref} title={item.media.title} />{" "}
          <span className="text-zinc-500">to</span>{" "}
          <NavLink
            href={listHref}
            className="font-medium text-zinc-100 transition hover:text-emerald-400"
          >
            {item.list.name}
          </NavLink>
        </p>
      </FeedRowShell>
    </FeedCard>
  );
}

function FollowRow({ item }: { item: Extract<FeedItem, { kind: "follow" }> }) {
  return (
    <FeedCard>
      <FeedRowShell
        actor={item.actor}
        action={<ActionBadge tone="follow">followed</ActionBadge>}
        time={item.createdAt}
      >
        <p className="text-sm leading-snug text-zinc-300">
          <UsernameLink username={item.actor.username} />{" "}
          <span className="text-zinc-500">followed</span>{" "}
          <UsernameLink username={item.target.username} />
        </p>
      </FeedRowShell>
    </FeedCard>
  );
}

function FeedRowShell({
  actor,
  media,
  mediaHref,
  action,
  time,
  children,
}: {
  actor: { username: string; avatarUrl: string | null };
  media?: { title: string; thumbnail: string | null };
  mediaHref?: string;
  action?: ReactNode;
  time: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <UserAvatar username={actor.username} avatarUrl={actor.avatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          {action}
          <FeedTime createdAt={time} className="mt-0 shrink-0" />
        </div>
        {children}
      </div>
      {media?.thumbnail && mediaHref ? (
        <NavLink
          href={mediaHref}
          className="relative mt-0.5 h-[3.25rem] w-[2.2rem] shrink-0 overflow-hidden rounded-md bg-zinc-800 ring-1 ring-white/10 transition hover:ring-white/25"
          title={media.title}
        >
          <Image
            src={media.thumbnail}
            alt=""
            fill
            sizes="44px"
            className="object-cover"
          />
        </NavLink>
      ) : null}
    </div>
  );
}

function ActionBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "log" | "rate" | "stash" | "list" | "follow";
}) {
  const tones = {
    log: "bg-sky-500/10 text-sky-300/90",
    rate: "bg-amber-500/10 text-amber-300/90",
    stash: "bg-emerald-500/10 text-emerald-300/90",
    list: "bg-violet-500/10 text-violet-300/90",
    follow: "bg-zinc-500/15 text-zinc-300",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        tones[tone]
      )}
    >
      {children}
    </span>
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

function FeedTime({
  createdAt,
  className,
}: {
  createdAt: string;
  className?: string;
}) {
  return (
    <time
      className={cn("mt-1 block text-[11px] text-zinc-600", className)}
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
      className="font-medium text-zinc-200 transition hover:text-emerald-400"
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
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/10"
      />
    );
  }

  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/90 text-xs font-semibold text-white ring-1 ring-white/10"
      aria-hidden
    >
      {username.charAt(0).toUpperCase()}
    </span>
  );
}
