const TIMING_ENABLED =
  process.env.HOME_TIMING === "1" ||
  process.env.MIDDLEWARE_TIMING === "1" ||
  process.env.VERCEL === "1";

export function isRequestTimingEnabled(): boolean {
  return TIMING_ENABLED;
}

export function createRequestTimer(scope: string) {
  const start = performance.now();
  let last = start;

  return {
    mark(step: string, detail?: Record<string, string | number | boolean | null>) {
      if (!TIMING_ENABLED) return;
      const now = performance.now();
      console.info(`[${scope}] ${step}`, {
        sinceStartMs: Math.round(now - start),
        stepMs: Math.round(now - last),
        ...detail,
      });
      last = now;
    },
  };
}
