import {
  PROFILE_GATE_STEP_INDEX,
  PROFILE_START_STEP_INDEX,
  isOnProfile,
} from "@/lib/tutorial-steps";

export function shouldShowTutorialOverlay(
  pathname: string,
  username: string,
  step: number
): boolean {
  if (step < PROFILE_GATE_STEP_INDEX) {
    return pathname === "/";
  }

  if (step === PROFILE_GATE_STEP_INDEX) {
    return true;
  }

  if (step >= PROFILE_START_STEP_INDEX) {
    return isOnProfile(pathname, username);
  }

  return false;
}
