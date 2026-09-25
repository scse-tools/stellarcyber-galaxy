import { proxiedFetch } from "@/lib/http";
import { forgetRestAccessToken, getRestAccessToken } from "@/lib/rest/access-token";
import type { InstanceRow } from "@/lib/types";

const TENANTS_PATH = "/connect/api/v1/tenants";
const REQUEST_TIMEOUT_MS = Number(process.env.GALAXY_REST_TIMEOUT_MS ?? 15_000);

export interface TenantWriteResult {
  ok: boolean;
  error?: string;
}

async function sendJson(row: InstanceRow, method: string, path: string, body?: unknown): Promise<Response> {
  const origin = new URL(row.consoleUrl).origin;
  const attempt = async () => {
    const token = await getRestAccessToken(row);
    return proxiedFetch(`${origin}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  };
  let response = await attempt();
  if (response.status === 401) {
    forgetRestAccessToken(row.id);
    response = await attempt();
  }
  return response;
}

async function toResult(response: Response): Promise<TenantWriteResult> {
  if (response.ok) return { ok: true };
  const detail = (await response.text().catch(() => "")).slice(0, 400);
  return { ok: false, error: `HTTP ${response.status}${detail ? `: ${detail}` : ""}` };
}

export async function createTenant(row: InstanceRow, payload: Record<string, unknown>): Promise<TenantWriteResult> {
  return toResult(await sendJson(row, "POST", TENANTS_PATH, payload));
}

export async function updateTenant(
  row: InstanceRow,
  custId: string,
  payload: Record<string, unknown>,
): Promise<TenantWriteResult> {
  return toResult(await sendJson(row, "PATCH", `${TENANTS_PATH}/${encodeURIComponent(custId)}`, payload));
}

/** Fetches one tenant's full record, or null when it can't be read. */
export async function getTenantDetail(row: InstanceRow, custId: string): Promise<Record<string, unknown> | null> {
  const response = await sendJson(row, "GET", `${TENANTS_PATH}/${encodeURIComponent(custId)}`);
  if (!response.ok) return null;
  const body = (await response.json().catch(() => null)) as { data?: Record<string, unknown> } | null;
  return body?.data ?? (body as Record<string, unknown> | null);
}
