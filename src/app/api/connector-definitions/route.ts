import { NextResponse } from "next/server";
import { listConnectorDefinitions } from "@/lib/connector-definitions";
import { errorResponse } from "@/lib/api-error";
import { requireUser, isGuardFailure } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    return NextResponse.json({ definitions: listConnectorDefinitions() });
  } catch (error) {
    return errorResponse(error);
  }
}
