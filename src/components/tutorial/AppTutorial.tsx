"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  completeTutorial,
  saveTutorialStep,
} from "@/app/actions/tutorial";
import { profilePath } from "@/lib/auth";
import { cn } from "@/lib/cn";
import {
  isOnProfile,
  PROFILE_GATE_STEP_INDEX,
  PROFILE_START_STEP_INDEX,
  readProfileTab,
  TUTORIAL_STEPS,
  type TutorialPlacement,
  type TutorialStep,
} from "@/lib/tutorial-steps";

const PADDING = 8;
const TOOLTIP_GAP = 14;
const TOOLTIP_EST_WIDTH = 288;
const TOOLTIP_EST_HEIGHT = 200;
const VIEWPORT_PAD = 16;
const TARGET_POLL_MS = 80;
const TARGET_POLL_MAX = 60;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface AppTutorialProps {
  username: string;
  initialStep: number;
  onDone: () => void;
  onStepChange: (step: number) => void;
}

function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 767px)").matches;
}

function resolveSelector(step: TutorialStep): string {
  if (step.target) return step.target;
  const mobile = isMobileViewport();
  return mobile ? step.targetMobile! : step.targetDesktop!;
}

function measureTarget(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function activeSelector(step: TutorialStep): string {
  const primary = resolveSelector(step);
  if (measureTarget(primary)) return primary;
  return step.fallbackTarget ?? primary;
}

function measureStepTarget(step: TutorialStep): Rect | null {
  return measureTarget(activeSelector(step));
}

function resolvePlacement(step: TutorialStep): TutorialPlacement {
  if (isMobileViewport() && step.placementMobile) return step.placementMobile;
  if (!isMobileViewport() && step.placementDesktop) return step.placementDesktop;
  return step.placement;
}

function scrollTargetIntoView(
  step: TutorialStep,
  reduceMotion: boolean | null
) {
  document.querySelector(activeSelector(step))?.scrollIntoView({
    block: "nearest",
    behavior: reduceMotion ? "auto" : "smooth",
  });
}

function rectsEqual(a: Rect | null, b: Rect | null): boolean {
  if (!a || !b) return a === b;
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  );
}

function centerRightTooltipStyle(): React.CSSProperties {
  return {
    top: "50%",
    right: VIEWPORT_PAD,
    left: "auto",
    transform: "translateY(-50%)",
  };
}

function resolveTooltipStyle(
  step: TutorialStep,
  rect: Rect | null,
  placement: TutorialPlacement
): React.CSSProperties {
  if (step.tooltipAnchor === "center-right") {
    return centerRightTooltipStyle();
  }
  if (!rect) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }
  return computeTooltipStyle(rect, placement);
}

function computeTooltipStyle(
  rect: Rect,
  placement: TutorialPlacement,
  tooltipWidth = TOOLTIP_EST_WIDTH,
  tooltipHeight = TOOLTIP_EST_HEIGHT
): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  let top = 0;
  let left = 0;
  let transform = "";

  switch (placement) {
    case "top":
      top = rect.top - TOOLTIP_GAP;
      left = centerX;
      transform = "translate(-50%, -100%)";
      break;
    case "bottom":
      top = rect.top + rect.height + TOOLTIP_GAP;
      left = centerX;
      transform = "translate(-50%, 0)";
      break;
    case "left":
      top = centerY;
      left = rect.left - TOOLTIP_GAP;
      transform = "translate(-100%, -50%)";
      break;
    case "right":
      top = centerY;
      left = rect.left + rect.width + TOOLTIP_GAP;
      transform = "translate(0, -50%)";
      break;
  }

  let x = left;
  let y = top;

  if (transform.includes("-50%")) {
    if (transform.startsWith("translate(-50%")) {
      x = left - tooltipWidth / 2;
    }
    if (transform.includes(", -100%)")) {
      y = top - tooltipHeight;
    } else if (transform.includes(", -50%)")) {
      y = top - tooltipHeight / 2;
    }
  } else if (transform === "translate(-100%, -50%)") {
    x = left - tooltipWidth;
    y = top - tooltipHeight / 2;
  } else if (transform === "translate(0, -50%)") {
    y = top - tooltipHeight / 2;
  }

  const clampedX = Math.min(
    Math.max(VIEWPORT_PAD, x),
    Math.max(VIEWPORT_PAD, vw - tooltipWidth - VIEWPORT_PAD)
  );
  const clampedY = Math.min(
    Math.max(VIEWPORT_PAD, y),
    Math.max(VIEWPORT_PAD, vh - tooltipHeight - VIEWPORT_PAD)
  );

  return {
    top: clampedY,
    left: clampedX,
    transform: "none",
  };
}

function profileHref(
  username: string,
  tab?: TutorialStep["profileTab"]
): string {
  const base = profilePath(username);
  if (!tab || tab === "top4") return base;
  return `${base}?tab=${tab}`;
}

export default function AppTutorial({
  username,
  initialStep,
  onDone,
  onStepChange,
}: AppTutorialProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const tabParam = searchParams.get("tab");

  const [step, setStep] = useState(initialStep);
  const [rect, setRect] = useState<Rect | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const advancedFromGate = useRef(false);

  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;
  const onProfile = isOnProfile(pathname, username);
  const activeTab = readProfileTab(searchParams);

  useEffect(() => {
    setStep(initialStep);
    advancedFromGate.current = false;
  }, [initialStep]);

  const persistStep = useCallback(
    (nextStep: number) => {
      onStepChange(nextStep);
      void saveTutorialStep(nextStep);
    },
    [onStepChange]
  );

  const goToStep = useCallback(
    (next: number) => {
      setStep(next);
      persistStep(next);
    },
    [persistStep]
  );

  useEffect(() => {
    if (step !== PROFILE_GATE_STEP_INDEX || !onProfile) return;
    if (advancedFromGate.current) return;

    advancedFromGate.current = true;
    goToStep(PROFILE_START_STEP_INDEX);
  }, [goToStep, onProfile, step]);

  useEffect(() => {
    setRect(null);
  }, [step]);

  useEffect(() => {
    const stepConfig = TUTORIAL_STEPS[step];
    let attempts = 0;
    let timeoutId = 0;
    let cancelled = false;

    const update = () => {
      if (cancelled) return;
      const next = measureStepTarget(stepConfig);
      if (next) {
        setRect((prev) => (rectsEqual(prev, next) ? prev : next));
      }
    };

    const poll = () => {
      if (cancelled) return;
      const next = measureStepTarget(stepConfig);
      if (next) {
        setRect((prev) => (rectsEqual(prev, next) ? prev : next));
        scrollTargetIntoView(stepConfig, reduceMotion);
        return;
      }

      attempts += 1;
      if (attempts < TARGET_POLL_MAX) {
        timeoutId = window.setTimeout(poll, TARGET_POLL_MS);
      }
    };

    poll();

    const onLayout = () => update();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [reduceMotion, step, pathname, tabParam]);

  const dismiss = useCallback(async () => {
    if (dismissing) return;
    setDismissing(true);
    await completeTutorial();
    onDone();
  }, [dismissing, onDone]);

  const next = useCallback(() => {
    if (current.profileGate) {
      goToStep(PROFILE_START_STEP_INDEX);
      return;
    }

    if (isLast) {
      void dismiss();
      return;
    }

    const nextStep = step + 1;
    const nextConfig = TUTORIAL_STEPS[nextStep];

    if (nextConfig.profileTab && onProfile && activeTab !== nextConfig.profileTab) {
      router.push(profileHref(username, nextConfig.profileTab));
    }

    goToStep(nextStep);
  }, [
    activeTab,
    current.profileGate,
    dismiss,
    goToStep,
    isLast,
    onProfile,
    router,
    step,
    username,
  ]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        void dismiss();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismiss]);

  const highlight = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  const placement = resolvePlacement(current);
  const gateButtonLabel = current.profileGate ? "Got it" : isLast ? "Got it" : "Next";

  return (
    <div
      className="fixed inset-0 z-[200] pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
    >
      {highlight ? (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-emerald-400/90"
          style={{
            ...highlight,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-black/72" aria-hidden />
      )}

      <AnimatePresence mode="wait">
        {rect || current.profileGate ? (
          <motion.div
            key={step}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto fixed z-10 w-[min(18rem,calc(100vw-2rem))]"
            style={resolveTooltipStyle(current, rect, placement)}
          >
            <div className="rounded-xl border border-white/10 bg-zinc-900 p-4 shadow-xl shadow-black/50">
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
                  {step + 1} of {TUTORIAL_STEPS.length}
                </p>
                <button
                  type="button"
                  onClick={() => void dismiss()}
                  disabled={dismissing}
                  className="shrink-0 text-[12px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  Skip
                </button>
              </div>
              <h2 className="text-[15px] font-semibold text-white">
                {current.title}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">
                {current.body}
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void next()}
                  disabled={dismissing}
                  className={cn(
                    "rounded-md bg-emerald-600 px-3.5 py-1.5 text-[13px] font-medium text-white",
                    "transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  {gateButtonLabel}
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
