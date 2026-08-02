import { notFound } from "next/navigation";
import PublicProfileView from "@/components/PublicProfileView";
import { getProfileByUsername } from "@/app/actions/profile";
import { getStashShelvesByUserId } from "@/app/actions/stash";
import { createClient } from "@/utils/supabase/server";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    return { title: "Profile not found · Stashd" };
  }

  return {
    title: `@${profile.username} · Stashd`,
    description: `Check out @${profile.username}'s Top 4 stash on Stashd`,
  };
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const [shelves, supabase] = await Promise.all([
    getStashShelvesByUserId(profile.id),
    createClient(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user?.id === profile.id;

  return (
    <PublicProfileView
      username={profile.username}
      avatarUrl={profile.avatarUrl}
      shelves={shelves}
      isOwner={isOwner}
    />
  );
}
