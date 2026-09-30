import { NextResponse } from "next/server";
import { getInstanceRow } from "@/lib/instance-repo";
import { fetchCases } from "@/lib/rest/cases";
import { errorResponse } from "@/lib/api-error";
import { requireUser, isGuardFailure } from "@/lib/auth/session";

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

    const search = new URL(request.url).searchParams;
    const tenantId = search.get("tenantId");
    const limit = Number(search.get("limit") ?? 200);
    const cases = await fetchCases(row, tenantId, Number.isFinite(limit) ? limit : 200);
    return NextResponse.json({ cases });
  } catch (error) {
    return errorResponse(error);
  }
}
