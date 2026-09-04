export type PresetId = "today" | "1h" | "12h" | "24h" | "7d" | "14d" | "1m" | "custom";

export interface TimeRangeSelection {
  preset: PresetId;
  /** `datetime-local` values (local time, no zone), only used when preset is "custom". */
  from?: string;
  to?: string;
}

export interface ResolvedRange {
  from: number;
  to: number;
}

export const TIME_PRESETS: Array<{ id: PresetId; label: string; title: string }> = [
  { id: "today", label: "Today", title: "Since local midnight" },
  { id: "1h", label: "1HR", title: "Last hour" },
  { id: "12h", label: "12HR", title: "Last 12 hours" },
  { id: "24h", label: "24HR", title: "Last 24 hours" },
  { id: "7d", label: "7D", title: "Last 7 days" },
  { id: "14d", label: "14D", title: "Last 14 days" },
  { id: "1m", label: "1M", title: "Last month" },
  { id: "custom", label: "Custom", title: "Pick an exact window" },
];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const DEFAULT_SELECTION: TimeRangeSelection = { preset: "24h" };

/** Parses a `datetime-local` string as local wall-clock time. */
export function parseLocalDateTime(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

/** Formats an epoch value back into a `datetime-local` input value. */
export function toLocalDateTimeValue(epochMs: number): string {
  const date = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** Turns a selection into the epoch-millisecond window `listCases` expects. */
export function resolveTimeRange(
  selection: TimeRangeSelection,
  now: number = Date.now(),
): ResolvedRange {
  if (selection.preset === "custom") {
    const from = parseLocalDateTime(selection.from);
    const to = parseLocalDateTime(selection.to);
    if (from !== null && to !== null && from < to) return { from, to };
    return { from: now - DAY, to: now };
  }

  switch (selection.preset) {
    case "today": {
      const midnight = new Date(now);
      midnight.setHours(0, 0, 0, 0);
      return { from: midnight.getTime(), to: now };
    }
    case "1h":
      return { from: now - HOUR, to: now };
    case "12h":
      return { from: now - 12 * HOUR, to: now };
    case "7d":
      return { from: now - 7 * DAY, to: now };
    case "14d":
      return { from: now - 14 * DAY, to: now };
    case "1m": {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      return { from: start.getTime(), to: now };
    }
    case "24h":
    default:
      return { from: now - DAY, to: now };
  }
}

export function isCustomRangeValid(selection: TimeRangeSelection): boolean {
  const from = parseLocalDateTime(selection.from);
  const to = parseLocalDateTime(selection.to);
  return from !== null && to !== null && from < to;
}

const STAMP = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Human summary of the active window, shown next to the picker. */
export function describeRange(selection: TimeRangeSelection, now: number = Date.now()): string {
  const { from, to } = resolveTimeRange(selection, now);
  const preset = TIME_PRESETS.find((entry) => entry.id === selection.preset);
  if (selection.preset === "custom") return `${STAMP.format(from)} → ${STAMP.format(to)}`;
  return `${preset?.title ?? "Window"} · from ${STAMP.format(from)}`;
}
