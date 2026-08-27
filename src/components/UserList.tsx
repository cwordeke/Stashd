import NavLink from "@/components/NavLink";
import type { SocialUser } from "@/app/actions/social";
import { cn } from "@/lib/cn";

interface UserListProps {
  users: SocialUser[];
  emptyMessage: string;
  className?: string;
}

export default function UserList({
  users,
  emptyMessage,
  className,
}: UserListProps) {
  if (!users.length) {
    return (
      <p className={cn("text-sm text-zinc-500", className)}>{emptyMessage}</p>
    );
  }

  return (
    <ul
      className={cn(
        "divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/40",
        className
      )}
    >
      {users.map((user) => (
        <li key={user.id}>
          <NavLink
            href={`/u/${user.username}`}
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03]"
          >
            <UserAvatar username={user.username} avatarUrl={user.avatar_url} />
            <span className="min-w-0 truncate text-sm font-medium text-zinc-100">
              @{user.username}
            </span>
          </NavLink>
        </li>
      ))}
    </ul>
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
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white"
      aria-hidden
    >
      {username.charAt(0).toUpperCase()}
    </span>
  );
}
