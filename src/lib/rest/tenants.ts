import { proxiedFetch } from "@/lib/http";
import {
  forgetRestAccessToken,
  getRestAccessTokenWith,
  type RestAuthConfig,
} from "@/lib/rest/access-token";
import { readCredentials } from "@/lib/instance-repo";
import type { InstanceRow, Tenant } from "@/lib/types";

const TENANTS_PATH = "/connect/api/v1/tenants";
const REQUEST_TIMEOUT_MS = Number(process.env.GALAXY_REST_TIMEOUT_MS ?? 15_000);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const ID_KEYS = ["cust_id", "tenant_id", "custId", "tenantId", "id"];
const NAME_KEYS = ["name", "tenant_name", "customer_name", "cust_name", "display_name"];

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number") return String(value);
  }
  return null;
}

/** Pulls the tenant array out of `{ total, tenants }` (or a few reasonable variants). */
function readTenants(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];
  for (const key of ["tenants", "data", "results", "items"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord);
    if (isRecord(value) && Array.isArray(value.tenants)) return value.tenants.filter(isRecord);
  }
  return [];
}

function normalize(rows: Record<string, unknown>[]): Tenant[] {
  const tenants: Tenant[] = [];
  for (const row of rows) {
    const id = firstString(row, ID_KEYS);
    if (!id) continue;
    tenants.push({ id, name: firstString(row, NAME_KEYS) ?? id });
  }
  return tenants;
}

/**
 * Lists the tenants/customers visible to an instance's API key. Not every instance is an MSSP
 * parent, so a 404 or empty response is treated as "no tenants" rather than an error.
 */
export async function fetchTenantsWith(config: RestAuthConfig): Promise<Tenant[]> {
  const origin = new URL(config.consoleUrl).origin;

  try {
    const request = async () => {
      const token = await getRestAccessTokenWith(config);
      return proxiedFetch(`${origin}${TENANTS_PATH}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    };

    let response = await request();
    if (response.status === 401) {
      forgetRestAccessToken(config.id);
      response = await request();
    }
    if (!response.ok) return [];

    return normalize(readTenants(await response.json().catch(() => null)));
  } catch {
    return [];
  }
}

export async function fetchTenants(row: InstanceRow): Promise<Tenant[]> {
  return fetchTenantsWith({
    id: row.id,
    consoleUrl: row.consoleUrl,
    apiKey: readCredentials(row).apiKey,
  });
}
