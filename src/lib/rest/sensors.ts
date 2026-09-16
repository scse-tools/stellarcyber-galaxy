import { proxiedFetch, restUrl } from "@/lib/http";
import { forgetRestAccessToken, getRestAccessToken } from "@/lib/rest/access-token";
import type { InstanceRow, SensorMetrics, SensorStatus } from "@/lib/types";

const EMPTY_METRICS: SensorMetrics = {
  cpuAvg: 0, cpuMax: 0, diskAvg: 0, diskMax: 0, inBytes: 0, outBytes: 0,
};

/** Reads a 0–100 usage value, or null when the sensor doesn't report one. */
const toPct = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
};

const DATA_SENSORS_PATH = "/connect/api/v1/data_sensors";
const REQUEST_TIMEOUT_MS = Number(process.env.GALAXY_REST_TIMEOUT_MS ?? 15_000);

interface SensorRow {
  feature?: unknown;
  connection_status?: unknown;
  need_upgrade?: unknown;
  inbytes_total?: unknown;
  outbytes_total?: unknown;
  cpu_usage?: unknown;
  disk_usage?: unknown;
}

const toNum = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

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
  let noOutput = 0;
  const cpu: number[] = [];
  const disk: number[] = [];
  let inBytes = 0;
  let outBytes = 0;

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

    // Receiving input but sending no output is a forwarding fault.
    const sensorIn = toNum(sensor.inbytes_total);
    const sensorOut = toNum(sensor.outbytes_total);
    if (sensorIn > 0 && sensorOut <= 0) noOutput += 1;
    inBytes += sensorIn;
    outBytes += sensorOut;

    const cpuPct = toPct(sensor.cpu_usage);
    if (cpuPct !== null) cpu.push(cpuPct);
    const diskPct = toPct(sensor.disk_usage);
    if (diskPct !== null) disk.push(diskPct);
  }

  const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const metrics: SensorMetrics = {
    cpuAvg: mean(cpu),
    cpuMax: cpu.length ? Math.round(Math.max(...cpu)) : 0,
    diskAvg: mean(disk),
    diskMax: disk.length ? Math.round(Math.max(...disk)) : 0,
    inBytes,
    outBytes,
  };

  return { total: sensors.length, byFeature, connection, upgrade, noOutput, metrics };
}

/**
 * Fetches the instance's sensors over the REST API and categorizes them for the tile.
 * `tenantOverride` (undefined = use the instance's configured tenant) lets a tile's dropdown
 * scope this one request to a different tenant without changing the instance's saved setting.
 */
export async function fetchSensorStatus(
  row: InstanceRow,
  tenantOverride?: string | null,
): Promise<SensorStatus> {
  const base = { instanceId: row.id, fetchedAt: new Date().toISOString() };
  const origin = new URL(row.consoleUrl).origin;
  const tenantId = row.tenantId ?? tenantOverride ?? null;

  try {
    const request = async () => {
      const token = await getRestAccessToken(row);
      const controller = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      return proxiedFetch(restUrl(origin, DATA_SENSORS_PATH, tenantId), {
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
      noOutput: 0,
      metrics: EMPTY_METRICS,
      error: error instanceof Error ? error.message : "Unknown sensor error.",
    };
  }
}
