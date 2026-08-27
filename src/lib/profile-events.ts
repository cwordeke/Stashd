export const PROFILE_UPDATED_EVENT = "stashd:profile-updated";

export function notifyProfileUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
}
