import { NextResponse } from "next/server";
import { getInstanceRow } from "@/lib/instance-repo";
import { fetchConnectorStatus } from "@/lib/rest/connectors";
import { errorResponse } from "@/lib/api-error";
import { requireUser, isGuardFailure } from "@/lib/auth/session";
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
