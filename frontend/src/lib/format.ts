const DAY_MS = 24 * 60 * 60 * 1000;

/** 75 → "1:15", 3725 → "1:02:05" */
export function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = String(s % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** 274 → "5 min", 3900 → "1 hr 5 min", 40 → "40 sec" */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)} sec`;
  const minutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  if (!hours) return `${minutes} min`;
  return minutes % 60 ? `${hours} hr ${minutes % 60} min` : `${hours} hr`;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", ...opts });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso, { weekday: "short" })}, ${formatTime(iso)}`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Section headers used in the meetings library, e.g. "Today", "Yesterday", "This week", "September 2026". */
export function dateGroupLabel(iso: string, now = new Date()): string {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This week";
  if (days < 14) return "Last week";
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Due dates are plain dates (YYYY-MM-DD) and must not be shifted by the local timezone. */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${toDateInputValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function describeDueDate(value: string, now = new Date()): { label: string; overdue: boolean } {
  const due = parseLocalDate(value);
  const days = Math.round((due.getTime() - startOfDay(now)) / DAY_MS);
  const label =
    days === 0
      ? "Today"
      : days === 1
        ? "Tomorrow"
        : days === -1
          ? "Yesterday"
          : due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return { label, overdue: days < 0 };
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}
