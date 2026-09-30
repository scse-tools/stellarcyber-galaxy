import { NextResponse } from "next/server";
import { getInvestigation } from "@/lib/investigation/investigations-repo";
import { errorResponse } from "@/lib/api-error";
import { requireUser, isGuardFailure } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; caseId: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    const { id, caseId } = await params;
    return NextResponse.json({ investigation: getInvestigation(id, caseId) });
  } catch (error) {
    return errorResponse(error);
  }
}
