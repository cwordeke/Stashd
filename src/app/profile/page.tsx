import { redirect } from "next/navigation";
import { getOwnProfile } from "@/lib/profile";

/** Legacy route — send owners to their public profile URL */
export default async function ProfilePage() {
  const profile = await getOwnProfile();

  if (!profile) {
    redirect("/onboarding");
  }

  redirect(`/u/${profile.username}`);
}
