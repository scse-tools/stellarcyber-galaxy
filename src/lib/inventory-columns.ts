import { cellText, type Row } from "@/lib/table-export";
import { formatBytes } from "@/lib/utils";

/** Columns whose raw byte value is shown human-readably (KB/MB/GB) but sorted by real value. */
const BYTE_COLUMNS = new Set(["inbytes_total", "outbytes_total"]);

/** Text to display for a cell: byte columns become KB/MB/GB, everything else is plain. */
export function displayCell(column: string, value: unknown): string {
  if (BYTE_COLUMNS.has(column)) {
    const n = Number(value);
    if (Number.isFinite(n)) return formatBytes(n);
  }
  return cellText(value);
}

/** Column-aware comparator: byte columns sort by their real numeric value, others by display text. */
export function compareByColumn(column: string, a: unknown, b: unknown): number {
  if (BYTE_COLUMNS.has(column)) return (Number(a) || 0) - (Number(b) || 0);
  return compareCells(cellText(a), cellText(b));
}

export interface ColumnSection {
  label: string;
  /** HSL triplet for the section's accent colour. */
  hue: string;
  columns: string[];
}

interface SectionDef {
  key: string;
  label: string;
  hue: string;
  match: (field: string) => boolean;
}

// Field-name patterns → logical sections (first match wins; the last is a catch-all).
const SECTION_DEFS: SectionDef[] = [
  {
    key: "identity",
    label: "Identity",
    hue: "210 90% 62%",
    match: (f) =>
      /(^name$|hostname|_id$|^id$|sensor_id|internal_sensor_id|cust_id|cust_name|tenantid|tenant_name|run_on)/.test(f),
  },
  {
    key: "class",
    label: "Classification",
    hue: "265 80% 70%",
    match: (f) =>
      [
        "feature", "type", "category", "mode", "os", "platform", "is_collect",
        "is_respond", "license", "sensor_profile_name", "tunnel_enabled",
      ].includes(f),
  },
  {
    key: "status",
    label: "Status & health",
    hue: "150 62% 52%",
    match: (f) =>
      /^status(_|$)/.test(f) ||
      [
        "connection_status", "active", "auth_state_code", "need_upgrade",
        "license_log", "message", "service_status", "feedback",
      ].includes(f),
  },
  {
    key: "metrics",
    label: "Metrics",
    hue: "178 60% 52%",
    match: (f) => ["cpu_usage", "disk_usage", "inbytes_total", "outbytes_total"].includes(f),
  },
  { key: "network", label: "Network", hue: "200 75% 62%", match: (f) => /ip_address/.test(f) },
  {
    key: "versions",
    label: "Versions",
    hue: "45 85% 62%",
    match: (f) => ["sw_version", "module_version", "version"].includes(f),
  },
  {
    key: "time",
    label: "Timestamps",
    hue: "220 12% 64%",
    match: (f) => /(_at$|_time$|^last_|timezone|created|modified|timestamp)/.test(f),
  },
  { key: "other", label: "Config & other", hue: "220 8% 56%", match: () => true },
];

/**
 * Orders columns into labelled sections, pinning the grouped-by field first in its own section.
 * Returns the sections that actually have columns, in a sensible order.
 */
export function sectionize(columns: string[], groupField: string): ColumnSection[] {
  const buckets = new Map<string, string[]>();
  for (const field of columns) {
    if (field === groupField) continue;
    const def = SECTION_DEFS.find((section) => section.match(field))!;
    (buckets.get(def.key) ?? buckets.set(def.key, []).get(def.key)!).push(field);
  }
  const sections: ColumnSection[] = [];
  if (columns.includes(groupField)) {
    sections.push({ label: `Grouped by ${groupField}`, hue: "25 80% 58%", columns: [groupField] });
  }
  for (const def of SECTION_DEFS) {
    const cols = buckets.get(def.key);
    if (cols && cols.length) sections.push({ label: def.label, hue: def.hue, columns: cols.sort() });
  }
  return sections;
}

export type CellTone = "good" | "bad" | "warn" | null;

/** Status-aware colour for a cell, based on the field and (occasionally) the whole row. */
export function cellTone(column: string, raw: unknown, row: Row): CellTone {
  const text = cellText(raw).toLowerCase();
  switch (column) {
    case "connection_status":
      return text === "connected" ? "good" : text ? "bad" : null;
    case "active":
      return text === "true" ? "good" : "bad";
    case "need_upgrade":
      return text === "true" ? "warn" : "good";
    case "status_code": {
      const code = Number(raw);
      return Number.isFinite(code) ? (code === 0 ? "good" : "bad") : null;
    }
    case "outbytes_total": {
      const inbound = Number(row.inbytes_total ?? 0);
      return inbound > 0 && Number(raw ?? 0) <= 0 ? "warn" : null;
    }
    case "cpu_usage":
    case "disk_usage": {
      const n = Number(raw);
      return Number.isFinite(n) ? (n >= 90 ? "bad" : n >= 75 ? "warn" : null) : null;
    }
    default:
      return null;
  }
}

export const TONE_TEXT: Record<Exclude<CellTone, null>, string> = {
  good: "text-[var(--severity-success)]",
  bad: "text-critical",
  warn: "text-high",
};

export interface StatusFilter {
  key: string;
  label: string;
}

/** True when a row matches a named sensor/connector status filter (as shown on the tiles). */
export function matchesStatus(tab: "sensors" | "connectors", key: string, row: Row): boolean {
  if (tab === "sensors") {
    const conn = cellText(row.connection_status).toLowerCase();
    switch (key) {
      case "connected":
        return conn === "connected";
      case "disconnected":
        return conn !== "connected";
      case "nooutput":
        return Number(row.inbytes_total ?? 0) > 0 && Number(row.outbytes_total ?? 0) <= 0;
      case "upgrade":
        return row.need_upgrade === true || row.need_upgrade === "true";
      default:
        return true;
    }
  }
  const collecting = row.is_collect === true;
  const active = row.active === true;
  const code = Number(row.status_code);
  switch (key) {
    case "active":
      return collecting && active;
    case "healthy":
      return collecting && active && code === 0;
    case "issues":
      return collecting && active && code !== 0;
    default:
      return true;
  }
}

/**
 * Columns shown by default per tab (name, IP, tenant name, status, and other relevant fields).
 * Every other field is hidden by default but can be enabled from the column picker.
 */
export const DEFAULT_VISIBLE: Record<"sensors" | "connectors", string[]> = {
  sensors: [
    "hostname", "local_ip_address", "nat_ip_address", "tenant_name",
    "connection_status", "feature", "cpu_usage", "disk_usage",
    "inbytes_total", "outbytes_total", "service_status", "sensor_profile_name",
    "sw_version", "need_upgrade", "oldest timestamp",
  ],
  connectors: [
    "name", "tenant_name", "category", "type", "active", "is_collect",
    "status_code", "status_message", "last_activity", "version",
  ],
};

/** Numeric-aware comparison of two already-stringified cell values. */
export function compareCells(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (a !== "" && b !== "" && Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}
