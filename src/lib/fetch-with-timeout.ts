type FetchWithTimeoutInit = RequestInit & {
  timeoutMs: number;
};

/**
 * `fetch` that aborts when `timeoutMs` elapses. Returns null on timeout/abort.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit
): Promise<Response | null> {
  const { timeoutMs, signal: externalSignal, ...requestInit } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const abortFromExternal = () => controller.abort();
  externalSignal?.addEventListener("abort", abortFromExternal);

  try {
    return await fetch(input, {
      ...requestInit,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return null;
    }
    throw error;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
}
