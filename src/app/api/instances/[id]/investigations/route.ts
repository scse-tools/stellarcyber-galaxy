import { NextResponse } from "next/server";
import { investigatedCaseIds } from "@/lib/investigation/investigations-repo";
import { errorResponse } from "@/lib/api-error";
import { requireUser, isGuardFailure } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** Case ids on this instance that have an investigation — drives the cases-table insignia. */
export async function GET(request: Request, { params }: Context) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    const { id } = await params;
    return NextResponse.json({ caseIds: investigatedCaseIds(id) });
  } catch (error) {
    return errorResponse(error);
  }
}
