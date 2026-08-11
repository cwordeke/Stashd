import { notFound, redirect } from "next/navigation";
import ListEditClient from "@/components/ListEditClient";
import { getOwnProfile, getProfileByUsername } from "@/lib/profile";

interface NewListPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: NewListPageProps) {
  const { username } = await params;
  return { title: `New list · ${username} · Stashd` };
}

export default async function NewListPage({ params }: NewListPageProps) {
  const { username } = await params;
  const [profile, own] = await Promise.all([
    getProfileByUsername(username),
    getOwnProfile(),
  ]);

  if (!profile) notFound();
  if (!own) redirect("/login");
  if (own.id !== profile.id) redirect(`/u/${username}?tab=lists`);

  return (
    <ListEditClient username={profile.username} list={null} mode="create" />
  );
}
