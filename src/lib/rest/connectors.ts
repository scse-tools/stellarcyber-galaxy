import { proxiedFetch } from "@/lib/http";
import { forgetRestAccessToken, getRestAccessToken } from "@/lib/rest/access-token";
import type { ConnectorStatus, InstanceRow } from "@/lib/types";

const CONNECTORS_PATH = "/connect/api/v1/connectors";
const REQUEST_TIMEOUT_MS = Number(process.env.GALAXY_REST_TIMEOUT_MS ?? 15_000);

interface ConnectorRow {
  is_collect?: unknown;
  active?: unknown;
  status?: { code?: unknown } | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function readConnectors(payload: unknown): ConnectorRow[] {
  if (Array.isArray(payload)) return payload as ConnectorRow[];
  if (!isRecord(payload)) return [];
  for (const key of ["connectors", "data", "results", "items"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value as ConnectorRow[];
    if (isRecord(value) && Array.isArray(value.connectors)) return value.connectors as ConnectorRow[];
  }
  return [];
}

function aggregate(connectors: ConnectorRow[]): Omit<ConnectorStatus, "instanceId" | "status" | "fetchedAt"> {
  // Only connectors that collect data count toward the tile's connector health.
  const collecting = connectors.filter((c) => c.is_collect === true);
  let active = 0;
  let healthy = 0;
  for (const connector of collecting) {
    // Health only applies to active connectors; inactive ones are not "in trouble".
    if (connector.active !== true) continue;
    active += 1;
    if (isRecord(connector.status) && Number(connector.status.code) === 0) healthy += 1;
  }
  return { total: collecting.length, active, healthy, issues: active - healthy };
}

/** Fetches collecting connectors over the REST API and summarizes their health for the tile. */
export async function fetchConnectorStatus(row: InstanceRow): Promise<ConnectorStatus> {
  const base = { instanceId: row.id, fetchedAt: new Date().toISOString() };
  const origin = new URL(row.consoleUrl).origin;

  try {
    const request = async () => {
      const token = await getRestAccessToken(row);
      return proxiedFetch(`${origin}${CONNECTORS_PATH}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    };
    let response = await request();
    if (response.status === 401) {
      forgetRestAccessToken(row.id);
      response = await request();
    }
    if (!response.ok) throw new Error(`connectors request failed (HTTP ${response.status}).`);

    const connectors = readConnectors(await response.json().catch(() => null));
    return { ...base, status: "ok", ...aggregate(connectors) };
  } catch (error) {
    forgetRestAccessToken(row.id);
    return {
      ...base,
      status: "error",
      total: 0,
      active: 0,
      healthy: 0,
      issues: 0,
      error: error instanceof Error ? error.message : "Unknown connector error.",
    };
  }
}
