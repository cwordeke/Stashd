import { notFound } from "next/navigation";
import ListDetailView from "@/components/ListDetailView";
import { getListById } from "@/app/actions/lists";
import { getProfileByUsername } from "@/lib/profile";
import { createClient } from "@/utils/supabase/server";

interface ListPageProps {
  params: Promise<{ username: string; listId: string }>;
}

export async function generateMetadata({ params }: ListPageProps) {
  const { listId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const list = await getListById(listId, user?.id ?? null);

  if (!list) return { title: "List not found · Stashd" };
  return {
    title: `${list.name} · ${list.username} · Stashd`,
    description: list.description || `A list by ${list.username} on Stashd`,
  };
}

export default async function ListPage({ params }: ListPageProps) {
  const { username, listId } = await params;
  const [profile, supabase] = await Promise.all([
    getProfileByUsername(username),
    createClient(),
  ]);

  if (!profile) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const list = await getListById(listId, user?.id ?? null);

  if (!list || list.userId !== profile.id) notFound();

  return (
    <ListDetailView list={list} isOwner={user?.id === profile.id} />
  );
}
