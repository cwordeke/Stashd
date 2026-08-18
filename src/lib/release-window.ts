/** Rolling window relative to the current server time. */
export function recentReleaseWindow(months = 3): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  from.setMonth(from.getMonth() - months);
  return { from, to };
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Local calendar date (YYYY-MM-DD), not UTC — avoids day-shift in US timezones. */
export function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function unixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
