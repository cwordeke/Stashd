import { getOwnProfile } from "@/lib/profile";
import {
  getServerClaims,
  requireAuthenticatedUser,
} from "@/lib/auth-guards";
import { isOnboardingDone } from "@/lib/jwt-auth";
import { redirect } from "next/navigation";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export const metadata = {
  title: "Onboarding · Stashd",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await requireAuthenticatedUser("/onboarding");

  const [{ success, error }, profile, claims] = await Promise.all([
    searchParams,
    getOwnProfile(),
    getServerClaims(),
  ]);

  if (isOnboardingDone(claims.username, claims.onboardingCompleted)) {
    const username = claims.username ?? profile?.username;
    if (username) {
      redirect(`/u/${username}`);
    }
  }

  const spotifyStatus =
    success === "spotify"
      ? "success"
      : error === "spotify_failed"
        ? "error"
        : null;

  return (
    <OnboardingFlow
      initialUsername={profile?.username ?? claims.username ?? ""}
      initialStep={spotifyStatus ? 2 : 0}
      spotifyStatus={spotifyStatus}
    />
  );
}
