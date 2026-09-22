import { NextResponse } from "next/server";
import { getInstanceRow } from "@/lib/instance-repo";
import { fetchSensorStatus } from "@/lib/rest/sensors";
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
    const key = `sensors:${id}:${tenantOverride ?? "default"}`;
    const sensors = await cached(key, STATS_CACHE_TTL_MS, () => fetchSensorStatus(row, tenantOverride), isOk);
    return NextResponse.json({ sensors });
  } catch (error) {
    return errorResponse(error);
  }
}
