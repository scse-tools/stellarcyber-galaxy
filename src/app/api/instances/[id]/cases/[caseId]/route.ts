import { NextResponse } from "next/server";
import { getInstanceRow } from "@/lib/instance-repo";
import { extractAiSummary, fetchCaseDetail, fetchCaseSummary } from "@/lib/rest/cases";
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
    const row = getInstanceRow(id);
    if (!row) return NextResponse.json({ error: "Instance not found." }, { status: 404 });

    const detail = await fetchCaseDetail(row, caseId);
    if (!detail) return NextResponse.json({ error: "Case not found." }, { status: 404 });
    const summary = await fetchCaseSummary(row, caseId);
    const aiSummary = extractAiSummary(detail, summary);
    return NextResponse.json({ detail, aiSummary });
  } catch (error) {
    return errorResponse(error);
  }
}
