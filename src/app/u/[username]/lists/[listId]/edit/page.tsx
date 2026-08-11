import { notFound, redirect } from "next/navigation";
import ListEditClient from "@/components/ListEditClient";
import { getListById } from "@/app/actions/lists";
import { getOwnProfile, getProfileByUsername } from "@/lib/profile";

interface EditListPageProps {
  params: Promise<{ username: string; listId: string }>;
}

export async function generateMetadata({ params }: EditListPageProps) {
  const { listId, username } = await params;
  const own = await getOwnProfile();
  const list = await getListById(listId, own?.id ?? null);
  if (!list) return { title: `Edit list · ${username} · Stashd` };
  return { title: `Edit ${list.name} · Stashd` };
}

export default async function EditListPage({ params }: EditListPageProps) {
  const { username, listId } = await params;
  const [profile, own] = await Promise.all([
    getProfileByUsername(username),
    getOwnProfile(),
  ]);

  if (!profile) notFound();
  if (!own) redirect("/login");
  if (own.id !== profile.id) redirect(`/u/${username}/lists/${listId}`);

  const list = await getListById(listId, own.id);
  if (!list || list.userId !== profile.id) notFound();

  return (
    <ListEditClient username={profile.username} list={list} mode="edit" />
  );
}
