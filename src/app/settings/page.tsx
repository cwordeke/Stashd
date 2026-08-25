import { redirect } from "next/navigation";
import SettingsView from "@/components/SettingsView";
import { getOwnProfile } from "@/lib/profile";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
  title: "Settings · Stashd",
  description: "Manage your Stashd account and profile",
};

export default async function SettingsPage() {
  const [profile, supabase] = await Promise.all([
    getOwnProfile(),
    createClient(),
  ]);

  if (!profile) {
    redirect("/onboarding");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  return (
    <SettingsView
      username={profile.username}
      avatarUrl={profile.avatarUrl}
      bio={profile.bio}
      email={user.email ?? null}
      preferredCategories={profile.preferredCategories}
    />
  );
}
