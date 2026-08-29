export const TUTORIAL_REPLAY_EVENT = "stashd:tutorial-replay";

export function notifyTutorialReplay() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TUTORIAL_REPLAY_EVENT));
}
