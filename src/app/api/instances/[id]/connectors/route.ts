import { NextResponse } from "next/server";
import { getInstanceRow } from "@/lib/instance-repo";
import { fetchConnectorStatus } from "@/lib/rest/connectors";
import { fetchTenants } from "@/lib/rest/tenants";
import { createConnector } from "@/lib/rest/connector-admin";
import { baseFieldsFromDefinition, getConnectorDefinition } from "@/lib/connector-definitions";
import { buildConnectorPayload } from "@/lib/onboarding-connector";
import { errorResponse } from "@/lib/api-error";
import { requireUser, requireAdmin, isGuardFailure } from "@/lib/auth/session";
import { cached, isOk, STATS_CACHE_TTL_MS } from "@/lib/rest/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    const { id } = await params;
    const row = getInstanceRow(id);
    if (!row) return NextResponse.json({ error: "Instance not found." }, { status: 404 });
    const searchParams = new URL(request.url).searchParams;
    const tenantOverride = searchParams.has("tenantId")
      ? searchParams.get("tenantId") || null
      : undefined;
    const key = `connectors:${id}:${tenantOverride ?? "default"}`;
    const connectors = await cached(key, STATS_CACHE_TTL_MS, () => fetchConnectorStatus(row, tenantOverride), isOk);
    return NextResponse.json({ connectors });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Creates one connector from a batch row: type/category identify the catalog definition. */
export async function POST(request: Request, { params }: Context) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const { id } = await params;
    const row = getInstanceRow(id);
    if (!row) return NextResponse.json({ error: "Instance not found." }, { status: 404 });

    const body = (await request.json().catch(() => null)) as { values?: Record<string, string> } | null;
    const values = body?.values ?? {};
    const type = (values.type ?? "").trim();
    const category = (values.category ?? "").trim();
    if (!type || !category) return NextResponse.json({ ok: false, error: "type and category are required." });

    const def = getConnectorDefinition(category, type);
    if (!def) return NextResponse.json({ ok: false, error: `Unknown connector "${category}/${type}".` });

    const tenantName = (values.tenant_name ?? "").trim();
    if (!tenantName) return NextResponse.json({ ok: false, error: "tenant_name is required." });
    const tenants = await fetchTenants(row);
    const tenant = tenants.find((t) => t.name.toLowerCase() === tenantName.toLowerCase());
    if (!tenant) return NextResponse.json({ ok: false, error: `Tenant "${tenantName}" was not found on ${row.name}.` });

    const payload = buildConnectorPayload(baseFieldsFromDefinition(def), true, values, tenant.id);
    return NextResponse.json(await createConnector(row, payload));
  } catch (error) {
    return errorResponse(error);
  }
}
