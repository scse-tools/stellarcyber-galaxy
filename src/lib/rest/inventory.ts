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
