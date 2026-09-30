import { proxiedFetch, restUrl } from "@/lib/http";
import { forgetRestAccessToken, getRestAccessToken } from "@/lib/rest/access-token";
import type { CaseAlert, CaseDetail, CaseSummary, InstanceRow } from "@/lib/types";

const CASES_PATH = "/connect/api/v1/cases";
const REQUEST_TIMEOUT_MS = Number(process.env.GALAXY_REST_TIMEOUT_MS ?? 15_000);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** GET with the console's Bearer token, retrying once after a 401 (token refresh). */
async function getJson(row: InstanceRow, path: string, tenantId?: string | null): Promise<unknown> {
  const origin = new URL(row.consoleUrl).origin;
  const url = restUrl(origin, path, tenantId ?? row.tenantId);
  const attempt = async () => {
    const token = await getRestAccessToken(row);
    return proxiedFetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  };
  let response = await attempt();
  if (response.status === 401) {
    forgetRestAccessToken(row.id);
    response = await attempt();
  }
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  return response.json().catch(() => null);
}

function str(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function num(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return 0;
}

/** Lists cases for a tile, trimmed to the fields the left-hand band needs. */
export async function fetchCases(
  row: InstanceRow,
  tenantId?: string | null,
  limit = 200,
): Promise<CaseSummary[]> {
  const body = await getJson(row, `${CASES_PATH}?limit=${limit}`, tenantId);
  const cases = isRecord(body) && isRecord(body.data) && Array.isArray(body.data.cases) ? body.data.cases : [];
  return cases.filter(isRecord).map((c) => ({
    id: str(c, "_id"),
    ticketId: str(c, "ticket_id"),
    name: str(c, "name"),
    score: num(c, "score"),
    severity: str(c, "severity"),
    status: str(c, "status"),
    size: num(c, "size"),
    assignee: str(c, "assignee_name") || str(c, "assignee"),
    createdAt: str(c, "created_at"),
    modifiedAt: str(c, "modified_at"),
    tenantName: str(c, "tenant_name"),
  }));
}

/** Full case record for the metadata panel. */
export async function fetchCaseDetail(row: InstanceRow, caseId: string): Promise<CaseDetail | null> {
  const body = await getJson(row, `${CASES_PATH}/${encodeURIComponent(caseId)}`);
  if (isRecord(body) && isRecord(body.data)) return body.data as CaseDetail;
  return isRecord(body) ? (body as CaseDetail) : null;
}

/**
 * Alerts for a case. The API returns Elasticsearch docs under `data.docs`; the
 * displayable fields live in each doc's `_source`, so we lift that up and keep `_id`.
 */
export async function fetchCaseAlerts(row: InstanceRow, caseId: string): Promise<CaseAlert[]> {
  const body = await getJson(row, `${CASES_PATH}/${encodeURIComponent(caseId)}/alerts`);
  const docs =
    isRecord(body) && isRecord(body.data) && Array.isArray(body.data.docs)
      ? body.data.docs
      : isRecord(body) && Array.isArray(body.data)
        ? body.data
        : [];
  return docs.filter(isRecord).map((doc) => {
    const source = isRecord(doc._source) ? doc._source : doc;
    return { _id: str(doc, "_id") || str(source, "_id"), ...source } as CaseAlert;
  });
}
