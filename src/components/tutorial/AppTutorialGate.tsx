"use client";

import { Suspense } from "react";
import AppTutorial from "@/components/tutorial/AppTutorial";

interface AppTutorialGateProps {
  username: string;
  initialStep: number;
  onComplete?: () => void;
  onStepChange: (step: number) => void;
}

function AppTutorialGateInner({
  username,
  initialStep,
  onComplete,
  onStepChange,
}: AppTutorialGateProps) {
  return (
    <AppTutorial
      username={username}
      initialStep={initialStep}
      onStepChange={onStepChange}
      onDone={() => onComplete?.()}
    />
  );
}

export default function AppTutorialGate(props: AppTutorialGateProps) {
  return (
    <Suspense fallback={null}>
      <AppTutorialGateInner {...props} />
    </Suspense>
  );
}
