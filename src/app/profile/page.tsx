import ProfileClient from "@/components/ProfileClient";
import { getUserStashShelves } from "@/app/actions/stash";

export default async function ProfilePage() {
  const shelves = await getUserStashShelves();

  return <ProfileClient shelves={shelves} />;
}
