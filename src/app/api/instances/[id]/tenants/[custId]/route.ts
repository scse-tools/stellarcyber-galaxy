import { NextResponse } from "next/server";
import { getInstanceRow } from "@/lib/instance-repo";
import { getTenantDetail, updateTenant } from "@/lib/rest/tenant-admin";
import { buildTenantPayload } from "@/lib/tenant-fields";
import { errorResponse } from "@/lib/api-error";
import { requireUser, requireAdmin, isGuardFailure } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; custId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    const { id, custId } = await params;
    const row = getInstanceRow(id);
    if (!row) return NextResponse.json({ error: "Instance not found." }, { status: 404 });
    const tenant = await getTenantDetail(row, custId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    return NextResponse.json({ tenant });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const { id, custId } = await params;
    const row = getInstanceRow(id);
    if (!row) return NextResponse.json({ error: "Instance not found." }, { status: 404 });

    const body = (await request.json().catch(() => null)) as { values?: Record<string, unknown> } | null;
    const payload = buildTenantPayload((body?.values ?? {}) as Record<string, string>);
    if (!payload.cust_name) return NextResponse.json({ ok: false, error: "cust_name is required." });

    return NextResponse.json(await updateTenant(row, custId, payload));
  } catch (error) {
    return errorResponse(error);
  }
}
