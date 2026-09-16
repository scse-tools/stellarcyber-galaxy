import { NextResponse } from "next/server";
import { getInstanceRow } from "@/lib/instance-repo";
import {
  enrichConnectorRows,
  fetchConnectorRows,
  fetchSensorRows,
  type InventoryRow,
} from "@/lib/rest/inventory";
import { fetchTenants } from "@/lib/rest/tenants";
import { errorResponse } from "@/lib/api-error";
import { requireUser, isGuardFailure } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** Full sensor + connector records for one instance, for the inventory table modal. */
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

    const settle = async (fetcher: Promise<InventoryRow[]>) => {
      try {
        return { rows: await fetcher, error: null as string | null };
      } catch (error) {
        return { rows: [] as InventoryRow[], error: error instanceof Error ? error.message : "failed" };
      }
    };
    const [sensors, connectors, tenants] = await Promise.all([
      settle(fetchSensorRows(row, tenantOverride)),
      settle(fetchConnectorRows(row, tenantOverride)),
      fetchTenants(row).catch(() => []),
    ]);
    const tenantNameById = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));
    return NextResponse.json({
      sensors: sensors.rows,
      connectors: enrichConnectorRows(connectors.rows, tenantNameById),
      sensorError: sensors.error,
      connectorError: connectors.error,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
