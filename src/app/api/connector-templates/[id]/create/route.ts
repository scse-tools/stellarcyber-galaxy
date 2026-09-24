import { NextResponse } from "next/server";
import { getTemplate } from "@/lib/connector-templates-repo";
import { getInstanceRow } from "@/lib/instance-repo";
import { fetchTenants } from "@/lib/rest/tenants";
import { buildConnectorPayload } from "@/lib/onboarding-connector";
import { proxiedFetch } from "@/lib/http";
import { forgetRestAccessToken, getRestAccessToken } from "@/lib/rest/access-token";
import { errorResponse } from "@/lib/api-error";
import { requireAdmin, isGuardFailure } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONNECTORS_PATH = "/connect/api/v1/connectors";
const REQUEST_TIMEOUT_MS = Number(process.env.GALAXY_REST_TIMEOUT_MS ?? 15_000);

type Context = { params: Promise<{ id: string }> };

/** Creates one connector on the template's instance from a single onboarding-CSV row. */
export async function POST(request: Request, { params }: Context) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const { id } = await params;

    const template = getTemplate(id);
    if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });
    const row = getInstanceRow(template.instanceId);
    if (!row) return NextResponse.json({ error: "The template's server no longer exists." }, { status: 404 });

    const body = (await request.json().catch(() => null)) as { values?: Record<string, string> } | null;
    const values = body?.values ?? {};
    const tenantName = (values.tenant_name ?? "").trim();
    if (!tenantName) return NextResponse.json({ ok: false, error: "tenant_name is required." });

    const tenants = await fetchTenants(row);
    const tenant = tenants.find((t) => t.name.toLowerCase() === tenantName.toLowerCase());
    if (!tenant) {
      return NextResponse.json({ ok: false, error: `Tenant "${tenantName}" was not found on ${row.name}.` });
    }

    const payload = buildConnectorPayload(template, values, tenant.id);
    const origin = new URL(row.consoleUrl).origin;
    const send = async () => {
      const token = await getRestAccessToken(row);
      return proxiedFetch(`${origin}${CONNECTORS_PATH}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    };

    let response = await send();
    if (response.status === 401) {
      forgetRestAccessToken(row.id);
      response = await send();
    }
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 400);
      return NextResponse.json({ ok: false, error: `HTTP ${response.status}${detail ? `: ${detail}` : ""}` });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
