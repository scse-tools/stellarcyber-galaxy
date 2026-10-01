import { alertId } from "@/lib/observables";
import type { CaseAlert } from "@/lib/types";

export interface Ttp {
  /** MITRE id (technique Txxxx[.yyy] or tactic TAxxxx), when present. */
  id: string;
  name: string;
  kind: "tactic" | "technique";
}

const rec = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const str = (value: unknown): string =>
  typeof value === "string" ? value : typeof value === "number" ? String(value) : "";

const ID_RE = /\b(TA?\d{4}(?:\.\d{3})?)\b/i;

function add(map: Map<string, Ttp>, kind: Ttp["kind"], id: string, name: string): void {
  const cleanId = id.toUpperCase();
  const key = `${kind}:${cleanId || name.toLowerCase()}`;
  if (!cleanId && !name) return;
  const existing = map.get(key);
  // Prefer an entry that has both id and name.
  if (!existing || (!existing.name && name) || (!existing.id && cleanId)) {
    map.set(key, { id: cleanId, name: name || existing?.name || "", kind });
  }
}

/** Reads tactic/technique entries out of one xdr_event value (object, array or string). */
function collect(value: unknown, kind: Ttp["kind"], map: Map<string, Ttp>): void {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) collect(item, kind, map);
    return;
  }
  const obj = rec(value);
  if (obj) {
    const id = str(obj.id ?? obj.mitre_id ?? obj.technique_id ?? obj.tactic_id ?? obj.external_id);
    const name = str(obj.name ?? obj.display_name ?? obj.text);
    add(map, kind, id, name);
    return;
  }
  const text = str(value);
  if (!text) return;
  const match = text.match(ID_RE);
  const id = match ? match[1] : "";
  const name = text.replace(ID_RE, "").replace(/^[\s:–—-]+/, "").trim();
  add(map, kind, id, name || text);
}

/** Stable selection/index key for a TTP. */
export const ttpKey = (ttp: Ttp): string => `${ttp.kind}:${(ttp.id || ttp.name).toUpperCase()}`;

/** The distinct TTPs found in one alert's xdr_event. */
function ttpsForAlert(alert: CaseAlert): Ttp[] {
  const xdr = rec(alert.xdr_event);
  if (!xdr) return [];
  const map = new Map<string, Ttp>();
  collect(xdr.tactic, "tactic", map);
  collect(xdr.tactics, "tactic", map);
  collect(xdr.technique, "technique", map);
  collect(xdr.techniques, "technique", map);
  return [...map.values()];
}

export interface TtpIndex {
  ttps: Ttp[];
  /** ttpKey -> ids of the alerts carrying that TTP. */
  byTtp: Map<string, Set<string>>;
}

/**
 * Pools MITRE ATT&CK tactics/techniques across a case's alerts and records which alerts carry each
 * one, so the TTP chips can filter the alert table the way observables do.
 */
export function buildTtpIndex(alerts: CaseAlert[]): TtpIndex {
  const global = new Map<string, Ttp>();
  const byTtp = new Map<string, Set<string>>();
  alerts.forEach((alert, i) => {
    const id = alertId(alert, i);
    for (const ttp of ttpsForAlert(alert)) {
      const key = ttpKey(ttp);
      const existing = global.get(key);
      if (!existing || (!existing.name && ttp.name) || (!existing.id && ttp.id)) {
        global.set(key, { id: ttp.id, name: ttp.name || existing?.name || "", kind: ttp.kind });
      }
      if (!byTtp.has(key)) byTtp.set(key, new Set());
      byTtp.get(key)!.add(id);
    }
  });
  const ttps = [...global.values()].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "tactic" ? -1 : 1; // tactics first
    return (a.id || a.name).localeCompare(b.id || b.name);
  });
  return { ttps, byTtp };
}

/** Pools MITRE ATT&CK TTPs across a case's alerts (list only). */
export function extractTtps(alerts: CaseAlert[]): Ttp[] {
  return buildTtpIndex(alerts).ttps;
}

/** Display label for a TTP: "T1059 Command and Scripting" / just the id / just the name. */
export function ttpLabel(ttp: Ttp): string {
  if (ttp.id && ttp.name) return `${ttp.id} ${ttp.name}`;
  return ttp.id || ttp.name;
}

/** Link to the MITRE ATT&CK page for a TTP id, when the id is well-formed. */
export function ttpUrl(ttp: Ttp): string | null {
  if (!ttp.id) return null;
  if (/^TA\d{4}$/i.test(ttp.id)) return `https://attack.mitre.org/tactics/${ttp.id.toUpperCase()}`;
  const tech = ttp.id.match(/^T(\d{4})(?:\.(\d{3}))?$/i);
  if (tech) return `https://attack.mitre.org/techniques/T${tech[1]}${tech[2] ? `/${tech[2]}` : ""}`;
  return null;
}
