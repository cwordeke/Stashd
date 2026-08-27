/** Human-readable relative time, e.g. "2 hours ago" or "3 days ago". */
export function formatRelativeTime(value: string): string {
  const timestamp = parseFeedTimestamp(value);
  if (timestamp == null) return value;

  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return "just now";

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return "just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  }

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  }

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) {
    return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  }

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) {
    return `${diffWeek} week${diffWeek === 1 ? "" : "s"} ago`;
  }

  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  }).format(date);
}

function parseFeedTimestamp(value: string): number | null {
  const dateOnly = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly) && value.length <= 10) {
    const [year, month, day] = dateOnly.split("-").map(Number);
    const parsed = new Date(year, month - 1, day).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}
