import { proxiedFetch, restUrl } from "@/lib/http";
import { forgetRestAccessToken, getRestAccessToken } from "@/lib/rest/access-token";
import type { InstanceRow, SensorStatus } from "@/lib/types";

const DATA_SENSORS_PATH = "/connect/api/v1/data_sensors";
const REQUEST_TIMEOUT_MS = Number(process.env.GALAXY_REST_TIMEOUT_MS ?? 15_000);

interface SensorRow {
  feature?: unknown;
  connection_status?: unknown;
  need_upgrade?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Pulls the sensor array out of `{ total, sensors }` (or a few reasonable variants). */
function readSensors(payload: unknown): SensorRow[] {
  if (Array.isArray(payload)) return payload as SensorRow[];
  if (!isRecord(payload)) return [];
  for (const key of ["sensors", "data", "results", "items"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value as SensorRow[];
    if (isRecord(value) && Array.isArray(value.sensors)) return value.sensors as SensorRow[];
  }
  return [];
}

function aggregate(sensors: SensorRow[]): Omit<SensorStatus, "instanceId" | "status" | "fetchedAt"> {
  const byFeature: Record<string, number> = {};
  const connection = { connected: 0, disconnected: 0, other: 0 };
  const upgrade = { need: 0, ok: 0 };

  for (const sensor of sensors) {
    const feature = typeof sensor.feature === "string" && sensor.feature ? sensor.feature : "unknown";
    byFeature[feature] = (byFeature[feature] ?? 0) + 1;

    const status = String(sensor.connection_status ?? "").toLowerCase();
    if (status === "connected") connection.connected += 1;
    else if (status.includes("disconnect") || status === "" || status === "offline")
      connection.disconnected += 1;
    else connection.other += 1;

    if (sensor.need_upgrade === true || sensor.need_upgrade === "true") upgrade.need += 1;
    else upgrade.ok += 1;
  }

  return { total: sensors.length, byFeature, connection, upgrade };
}

/** Fetches the instance's sensors over the REST API and categorizes them for the tile. */
export async function fetchSensorStatus(row: InstanceRow): Promise<SensorStatus> {
  const base = { instanceId: row.id, fetchedAt: new Date().toISOString() };
  const origin = new URL(row.consoleUrl).origin;

  try {
    const request = async () => {
      const token = await getRestAccessToken(row);
      const controller = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      return proxiedFetch(restUrl(origin, DATA_SENSORS_PATH, row.tenantId), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: controller,
      });
    };

    let response = await request();
    if (response.status === 401) {
      // The cached token may have just expired; force a fresh one and retry once.
      forgetRestAccessToken(row.id);
      response = await request();
    }
    if (!response.ok) throw new Error(`data_sensors request failed (HTTP ${response.status}).`);

    const sensors = readSensors(await response.json().catch(() => null));
    return { ...base, status: "ok", ...aggregate(sensors) };
  } catch (error) {
    forgetRestAccessToken(row.id);
    return {
      ...base,
      status: "error",
      total: 0,
      byFeature: {},
      connection: { connected: 0, disconnected: 0, other: 0 },
      upgrade: { need: 0, ok: 0 },
      error: error instanceof Error ? error.message : "Unknown sensor error.",
    };
  }
}
