import { NextResponse } from "next/server";
import { runInvestigation } from "@/lib/investigation/agent";
import { errorResponse } from "@/lib/api-error";
import { requireUser, isGuardFailure } from "@/lib/auth/session";
import type { Observable } from "@/lib/investigation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; caseId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    const { id, caseId } = await params;
    const body = (await request.json().catch(() => null)) as
      | { providerId?: string; caseName?: string; observables?: Observable[] }
      | null;
    if (!body?.providerId) return NextResponse.json({ error: "providerId is required." }, { status: 400 });
    const observables = (body.observables ?? []).filter((o) => o && o.kind && o.value);
    if (observables.length === 0) return NextResponse.json({ error: "Select at least one observable." }, { status: 400 });

    const result = await runInvestigation({
      instanceId: id,
      caseId,
      caseName: body.caseName ?? null,
      providerId: body.providerId,
      observables,
      userId: guard.id,
    });
    return NextResponse.json({ run: result.run });
  } catch (error) {
    return errorResponse(error);
  }
}
