"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  checkUsernameAvailable,
  completeOnboarding,
} from "@/app/actions/onboarding";
import { ProfilePageSkeleton } from "@/components/LoadingSkeleton";
import StepIdentity from "@/components/onboarding/StepIdentity";
import StepCategories from "@/components/onboarding/StepCategories";
import StepImport from "@/components/onboarding/StepImport";
import { useNavigationPending } from "@/context/NavigationPendingContext";
import { validateUsername } from "@/lib/username";
import { type MediaType } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";

const TOTAL_STEPS = 3;

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
};

interface OnboardingFlowProps {
  initialUsername: string;
}

export default function OnboardingFlow({
  initialUsername,
}: OnboardingFlowProps) {
  const router = useRouter();
  const { beginNavigation } = useNavigationPending();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [username, setUsername] = useState(initialUsername);
  const [ranked, setRanked] = useState<MediaType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const goTo = useCallback((next: number) => {
    setDirection(next > step ? 1 : -1);
    setError(null);
    setStep(next);
  }, [step]);

  const finish = useCallback(async () => {
    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      goTo(0);
      return;
    }

    const href = `/u/${username.trim().toLowerCase()}`;
    setBusy(true);
    setLeaving(true);

    const result = await completeOnboarding({
      username,
      preferredCategories: ranked,
    });

    if (!result.ok) {
      setLeaving(false);
      setBusy(false);
      setError(result.message);
      if (result.message.toLowerCase().includes("username")) {
        goTo(0);
      }
      return;
    }

    const supabase = createClient();
    void supabase.auth.updateUser({
      data: {
        username: result.username,
        onboarding_completed: true,
        preferred_categories: ranked,
      },
    });

    beginNavigation(href);
    router.replace(`/u/${result.username}`);
  }, [username, ranked, goTo, beginNavigation, router]);

  const continueFromIdentity = useCallback(async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    const check = await checkUsernameAvailable(username);
    setBusy(false);
    if (!check.available) {
      setError(check.message);
      return;
    }
    goTo(1);
  }, [busy, username, goTo]);

  const continueStep = useCallback(async () => {
    if (step === 0) {
      await continueFromIdentity();
      return;
    }
    if (step === 1) {
      if (ranked.length === 0) {
        setError("Rank at least one kind of media");
        return;
      }
      goTo(2);
      return;
    }
    if (step === 2) {
      await finish();
    }
  }, [step, ranked.length, continueFromIdentity, goTo, finish]);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Enter" || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "TEXTAREA") return;
      if (target?.closest("button, a")) return;
      if (busy || leaving) return;
      event.preventDefault();
      void continueStep();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, leaving, continueStep]);

  const progress = (step / TOTAL_STEPS) * 100;
  const usernameReady = validateUsername(username) === null;

  if (leaving) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="relative min-h-screen">
      <div className="flex min-h-screen flex-col">
        <div className="h-[2px] w-full bg-white/[0.06]">
          <motion.div
            className="h-full bg-emerald-600"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>

        <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-[17px] font-bold tracking-[-0.035em] text-white"
          >
            Stashd
          </Link>
          <div className="flex items-center gap-4">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => goTo(step - 1)}
                className="text-[12px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void finish()}
              disabled={busy || !usernameReady}
              className="text-[12px] font-medium text-zinc-500 transition-colors hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Skip for now
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center px-4 py-6 sm:px-6">
          <div className="mx-auto w-full max-w-lg">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={reduceMotion ? undefined : stepVariants}
                initial={reduceMotion ? { opacity: 0 } : "enter"}
                animate={reduceMotion ? { opacity: 1 } : "center"}
                exit={reduceMotion ? { opacity: 0 } : "exit"}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {step === 0 ? (
                  <StepIdentity
                    username={username}
                    onUsernameChange={(value) => {
                      setUsername(value);
                      setError(null);
                    }}
                    error={error}
                    busy={busy}
                    onContinue={() => void continueFromIdentity()}
                  />
                ) : null}
                {step === 1 ? (
                  <StepCategories
                    ranked={ranked}
                    onToggle={(type) => {
                      setError(null);
                      setRanked((current) =>
                        current.includes(type)
                          ? current.filter((item) => item !== type)
                          : [...current, type]
                      );
                    }}
                    error={error}
                    onContinue={() => void continueStep()}
                  />
                ) : null}
                {step === 2 ? (
                  <StepImport
                    onContinue={() => void finish()}
                    onImported={() => void finish()}
                  />
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
