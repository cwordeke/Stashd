import { getOwnProfile } from "@/lib/profile";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export const metadata = {
  title: "Onboarding · Stashd",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [{ success, error }, profile] = await Promise.all([
    searchParams,
    getOwnProfile(),
  ]);

  const spotifyStatus =
    success === "spotify"
      ? "success"
      : error === "spotify_failed"
        ? "error"
        : null;

  return (
    <OnboardingFlow
      initialUsername={profile?.username ?? ""}
      initialStep={spotifyStatus ? 2 : 0}
      spotifyStatus={spotifyStatus}
    />
  );
}
