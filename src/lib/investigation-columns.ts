import { cellText } from "@/lib/table-export";
import { compareCells } from "@/lib/inventory-columns";
import type { CaseAlert } from "@/lib/types";

/** Columns shown by default, in this order, when present in the alert data. */
export const DEFAULT_ALERT_COLUMNS = [
  "severity",
  "fidelity",
  "event_score",
  "event_name",
  "event_category",
  "event_type",
  "event_status",
  "description",
  "srcip",
  "dstip",
  "remote_ip",
  "tenant_name",
  "timestamp",
];

/** Turns `event_score` into "Event Score", `srcip` into "Srcip". */
export function columnLabel(column: string): string {
  return column
    .replace(/^_/, "")
    .split(/[_.]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Every column present across the alert set, curated defaults first, then the rest alphabetically. */
export function allAlertColumns(alerts: CaseAlert[]): string[] {
  const present = new Set<string>();
  for (const alert of alerts) for (const key of Object.keys(alert)) present.add(key);
  const ordered = DEFAULT_ALERT_COLUMNS.filter((c) => present.has(c));
  const rest = [...present].filter((c) => !ordered.includes(c)).sort((a, b) => a.localeCompare(b));
  return [...ordered, ...rest];
}

/** The columns visible on first view: the curated defaults that exist, or the first few otherwise. */
export function defaultVisibleColumns(all: string[]): string[] {
  const curated = all.filter((c) => DEFAULT_ALERT_COLUMNS.includes(c));
  return curated.length ? curated : all.slice(0, 10);
}

/** Sort comparator for an alert column (numeric-aware, via the shared cell comparator). */
export function compareAlerts(column: string, a: CaseAlert, b: CaseAlert): number {
  return compareCells(cellText(a[column]), cellText(b[column]));
}
