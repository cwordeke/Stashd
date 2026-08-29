/**
 * Resolve a promise within `ms`, otherwise return `fallback`.
 *
 * Note: this does not cancel the underlying work. Use `fetchWithTimeout` for
 * native fetch calls where abort is supported. Supabase client queries cannot
 * be aborted cleanly and may continue after the timeout resolves.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
