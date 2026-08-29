import { redirect } from "next/navigation";
import { requireCompletedOnboarding } from "@/lib/auth-guards";
import { getOwnProfile } from "@/lib/profile";

/** Legacy route — send owners to their public profile URL */
export default async function ProfilePage() {
  await requireCompletedOnboarding("/profile");
  const profile = await getOwnProfile();

  if (!profile) {
    redirect("/onboarding");
  }

  redirect(`/u/${profile.username}`);
}
