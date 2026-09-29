import { proxiedFetch } from "@/lib/http";
import { forgetRestAccessToken, getRestAccessToken } from "@/lib/rest/access-token";
import type { InstanceRow } from "@/lib/types";

const CONNECTORS_PATH = "/connect/api/v1/connectors";
const REQUEST_TIMEOUT_MS = Number(process.env.GALAXY_REST_TIMEOUT_MS ?? 15_000);

export interface ConnectorWriteResult {
  ok: boolean;
  error?: string;
}

/** Creates one connector on an instance, retrying once on a stale (401) token. */
export async function createConnector(
  row: InstanceRow,
  payload: Record<string, unknown>,
): Promise<ConnectorWriteResult> {
  const origin = new URL(row.consoleUrl).origin;
  const attempt = async () => {
    const token = await getRestAccessToken(row);
    return proxiedFetch(`${origin}${CONNECTORS_PATH}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  };
  let response = await attempt();
  if (response.status === 401) {
    forgetRestAccessToken(row.id);
    response = await attempt();
  }
  if (response.ok) return { ok: true };
  const detail = (await response.text().catch(() => "")).slice(0, 400);
  return { ok: false, error: `HTTP ${response.status}${detail ? `: ${detail}` : ""}` };
}
