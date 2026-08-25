import { getOwnProfile } from "@/lib/profile";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export const metadata = {
  title: "Onboarding · Stashd",
};

export default async function OnboardingPage() {
  const profile = await getOwnProfile();

  return (
    <OnboardingFlow initialUsername={profile?.username ?? ""} />
  );
}
