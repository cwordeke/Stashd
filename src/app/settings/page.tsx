import { redirect } from "next/navigation";
import SettingsView from "@/components/SettingsView";
import { requireCompletedOnboarding } from "@/lib/auth-guards";
import { getOwnProfile } from "@/lib/profile";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
  title: "Settings · Stashd",
  description: "Manage your Stashd account and profile",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await requireCompletedOnboarding("/settings");

  const [{ success, error }, profile, supabase] = await Promise.all([
    searchParams,
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

  const spotifyStatus =
    success === "spotify"
      ? "success"
      : error === "spotify_failed"
        ? "error"
        : null;

  return (
    <SettingsView
      username={profile.username}
      avatarUrl={profile.avatarUrl}
      bio={profile.bio}
      email={user.email ?? null}
      preferredCategories={profile.preferredCategories}
      initialGroup={spotifyStatus ? "data" : "account"}
      spotifyStatus={spotifyStatus}
    />
  );
}
