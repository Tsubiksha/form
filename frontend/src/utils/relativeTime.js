/**
 * relativeTime(value) — returns a human-friendly relative or absolute date string.
 * Uses actual timestamp math; never returns hardcoded strings.
 *
 * Examples:
 *   < 45 seconds  → "Just now"
 *   < 60 minutes  → "5 min ago"
 *   Same day      → "Today at 2:30 PM"
 *   Previous day  → "Yesterday at 9:00 AM"
 *   < 7 days      → "3 days ago"
 *   Older         → "Jul 28, 2026"
 */
export function relativeTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";

  const now = new Date();
  const diffMs = now - d;
  const seconds = Math.max(0, Math.floor(diffMs / 1000));

  if (seconds < 45) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);

  // Same calendar day
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart - 86400000);

  if (d >= todayStart) {
    return `Today at ${_fmt12(d)}`;
  }
  if (d >= yesterdayStart) {
    return `Yesterday at ${_fmt12(d)}`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;

  // Older — absolute date
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * formatDate(value) — always returns an absolute formatted date.
 * Example: "Jul 28, 2026"
 */
export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * formatDateTime(value) — absolute date + time.
 * Example: "Jul 28, 2026 at 2:30 PM"
 */
export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} at ${_fmt12(d)}`;
}

function _fmt12(d) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
}
