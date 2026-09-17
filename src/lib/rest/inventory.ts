import { proxiedFetch, restUrl } from "@/lib/http";
import { forgetRestAccessToken, getRestAccessToken } from "@/lib/rest/access-token";
import type { InstanceRow } from "@/lib/types";

const DATA_SENSORS_PATH = "/connect/api/v1/data_sensors";
const CONNECTORS_PATH = "/connect/api/v1/connectors";
const REQUEST_TIMEOUT_MS = Number(process.env.GALAXY_REST_TIMEOUT_MS ?? 15_000);

export type InventoryRow = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Extracts the row array from `{ total, <key> }` or a few reasonable variants. */
function readArray(payload: unknown, keys: string[]): InventoryRow[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];
  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord);
    if (isRecord(value) && Array.isArray(value[key])) return (value[key] as unknown[]).filter(isRecord);
  }
  return [];
}

async function fetchRows(
  row: InstanceRow,
  path: string,
  keys: string[],
  tenantOverride?: string | null,
): Promise<InventoryRow[]> {
  const origin = new URL(row.consoleUrl).origin;
  const tenantId = row.tenantId ?? tenantOverride ?? null;
  const request = async () => {
    const token = await getRestAccessToken(row);
    return proxiedFetch(restUrl(origin, path, tenantId), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  };
  let response = await request();
  if (response.status === 401) {
    forgetRestAccessToken(row.id);
    response = await request();
  }
  if (!response.ok) throw new Error(`request failed (HTTP ${response.status}).`);
  return readArray(await response.json().catch(() => null), keys);
}

/** Full sensor records (all fields), for the inventory table. */
export function fetchSensorRows(row: InstanceRow, tenantOverride?: string | null) {
  return fetchRows(row, DATA_SENSORS_PATH, ["sensors", "data", "results", "items"], tenantOverride);
}

/** Full connector records (all fields), for the inventory table. */
export function fetchConnectorRows(row: InstanceRow, tenantOverride?: string | null) {
  return fetchRows(row, CONNECTORS_PATH, ["connectors", "data", "results", "items"], tenantOverride);
}

// Feedback sub-fields whose numeric value is an epoch timestamp (seconds or milliseconds).
const TS_KEY = /(timestamp|_ts$|_time$|_at$|(^|_)time$)/i;

/** Formats an epoch (ms) as a readable `YYYY-MM-DD HH:MM:SS UTC` string. */
function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

/** Normalizes an epoch value to milliseconds, or null when it isn't a plausible timestamp. */
function epochToMs(value: number): number | null {
  if (value >= 1e12) return value; // already milliseconds
  if (value >= 1e9) return value * 1000; // seconds
  return null;
}

/** Recursively rewrites timestamp fields to readable strings, collecting the epochs seen (ms). */
function humanizeTimestamps(value: unknown, key: string | undefined, seen: number[]): unknown {
  if (Array.isArray(value)) return value.map((item) => humanizeTimestamps(item, key, seen));
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = humanizeTimestamps(v, k, seen);
    return out;
  }
  if (typeof value === "number" && key && TS_KEY.test(key)) {
    const ms = epochToMs(value);
    if (ms !== null) {
      seen.push(ms);
      return formatTimestamp(ms);
    }
  }
  return value;
}

/**
 * Pretty-prints each sensor's `feedback` JSON, replaces its epoch timestamp fields with readable
 * strings, and adds an `oldest timestamp` column populated from the earliest feedback timestamp.
 */
export function enrichSensorRows(rows: InventoryRow[]): InventoryRow[] {
  return rows.map((row) => {
    const out: InventoryRow = { ...row };
    // Present the customer/tenant column under the same name connectors use.
    if ("cust_name" in out) {
      out.tenant_name = out.cust_name;
      delete out.cust_name;
    }
    // Rewrite every top-level epoch timestamp field as a readable date string.
    for (const key of Object.keys(out)) {
      if (typeof out[key] === "number" && TS_KEY.test(key)) {
        const ms = epochToMs(out[key] as number);
        if (ms !== null) out[key] = formatTimestamp(ms);
      }
    }
    const raw = row.feedback;
    let parsed: unknown;
    if (typeof raw === "string" && raw.trim()) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        return out;
      }
    } else if (isRecord(raw)) {
      parsed = raw;
    } else {
      return out;
    }
    const seen: number[] = [];
    const humanized = humanizeTimestamps(parsed, undefined, seen);
    out.feedback = JSON.stringify(humanized, null, 2);
    if (seen.length) out["oldest timestamp"] = formatTimestamp(Math.min(...seen));
    return out;
  });
}

const TENANT_ID_KEYS = ["tenantid", "tenant_id", "cust_id", "custid"];

/** A connector's tenant id, under whichever of the known key spellings it uses. */
function connectorTenantId(row: InventoryRow): string | null {
  for (const key of TENANT_ID_KEYS) {
    const value = row[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number") return String(value);
  }
  return null;
}

/** Connector fields whose numeric value is an epoch timestamp, shown as readable dates. */
const CONNECTOR_TS_FIELDS = [
  "created_at", "modified_at", "last_activity", "last_data_received", "status_status_time",
];

/**
 * Adds a `tenant_name` (mapped from the connector's tenant id), flattens the nested `status`
 * object into individual `status_<field>` pairs, and rewrites epoch timestamp fields as readable
 * date strings — so all three surface as real, human-legible table columns.
 */
export function enrichConnectorRows(
  rows: InventoryRow[],
  tenantNameById: Map<string, string>,
): InventoryRow[] {
  return rows.map((row) => {
    const out: InventoryRow = { ...row };
    const tenantId = connectorTenantId(row);
    if (tenantId) out.tenant_name = tenantNameById.get(tenantId) ?? tenantId;
    if (isRecord(row.status)) {
      delete out.status;
      for (const [key, value] of Object.entries(row.status)) out[`status_${key}`] = value;
    }
    for (const field of CONNECTOR_TS_FIELDS) {
      const ms = epochToMs(Number(out[field]));
      if (ms !== null) out[field] = formatTimestamp(ms);
    }
    return out;
  });
}
