import { SEVERITIES, type Severity, type SeverityCounts } from "@/lib/types";

/** Palette lifted from the Stellar Cyber console's own `--severity-*` design tokens. */
export const SEVERITY_META: Record<Severity, { label: string; token: string; short: string }> = {
  critical: { label: "Critical", token: "var(--severity-critical)", short: "C" },
  high: { label: "High", token: "var(--severity-high)", short: "H" },
  medium: { label: "Medium", token: "var(--severity-medium)", short: "M" },
  low: { label: "Low", token: "var(--severity-low)", short: "L" },
};

/** Numeric severity as the console encodes it (`.severity_0` .. `.severity_4`). */
const NUMERIC_SEVERITY: Record<string, Severity> = {
  "0": "low",
  "1": "low",
  "2": "medium",
  "3": "high",
  "4": "critical",
  "5": "critical",
};

/** Maps any label Stellar Cyber might emit onto one of our four buckets. */
export function toSeverity(value: unknown): Severity | null {
  if (typeof value === "number") return NUMERIC_SEVERITY[String(Math.trunc(value))] ?? null;
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  if (!key) return null;
  if (key in NUMERIC_SEVERITY) return NUMERIC_SEVERITY[key];
  const direct = SEVERITIES.find((s) => key === s || key.startsWith(`${s}_`) || key.endsWith(`_${s}`));
  if (direct) return direct;
  if (key.includes("critical") || key.includes("severe")) return "critical";
  if (key.includes("high")) return "high";
  if (key.includes("medium") || key.includes("moderate")) return "medium";
  if (key.includes("low") || key.includes("info")) return "low";
  return null;
}

export function totalOf(counts: SeverityCounts): number {
  return SEVERITIES.reduce((sum, severity) => sum + counts[severity], 0);
}

/** Fractional share of each bucket, used for the tile's stacked bar. */
export function sharesOf(counts: SeverityCounts): Record<Severity, number> {
  const total = totalOf(counts);
  const shares = {} as Record<Severity, number>;
  for (const severity of SEVERITIES) {
    shares[severity] = total === 0 ? 0 : counts[severity] / total;
  }
  return shares;
}
