import { NextResponse } from "next/server";
import { getInstanceRow } from "@/lib/instance-repo";
import { fetchCaseStats } from "@/lib/mcp/stats";
import { errorResponse } from "@/lib/api-error";
import { requireUser, isGuardFailure } from "@/lib/auth/session";
import { rangeFromParams } from "@/lib/mcp/range-params";

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

    const range = rangeFromParams(new URL(request.url).searchParams);
    return NextResponse.json({ stats: await fetchCaseStats(row, range) });
  } catch (error) {
    return errorResponse(error);
  }
}
