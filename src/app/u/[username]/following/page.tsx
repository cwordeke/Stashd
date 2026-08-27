import { notFound } from "next/navigation";
import NavLink from "@/components/NavLink";
import UserList from "@/components/UserList";
import { getFollowing } from "@/app/actions/social";
import { getProfileByUsername } from "@/lib/profile";

interface FollowingPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: FollowingPageProps) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    return { title: "Profile not found · Stashd" };
  }

  return {
    title: `${profile.username} is following · Stashd`,
  };
}

export default async function FollowingPage({ params }: FollowingPageProps) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const users = await getFollowing(profile.id);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <NavLink
          href={`/u/${profile.username}`}
          className="text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          ← Back to profile
        </NavLink>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          Following
        </h1>
        <p className="mt-1 text-sm text-zinc-500">@{profile.username}</p>
      </div>

      <UserList
        users={users}
        emptyMessage="Not following anyone yet."
      />
    </div>
  );
}
