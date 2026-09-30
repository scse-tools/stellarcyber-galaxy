import { NextResponse } from "next/server";
import { addEvidence, deleteEvidence, getOrCreateInvestigation } from "@/lib/investigation/investigations-repo";
import { errorResponse } from "@/lib/api-error";
import { requireUser, isGuardFailure } from "@/lib/auth/session";
import type { EvidenceType } from "@/lib/investigation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; caseId: string }> };

const TYPES: EvidenceType[] = ["note", "link", "screenshot"];
const MAX_CONTENT_BYTES = 8 * 1024 * 1024; // ~8MB, covers a screenshot data URL

export async function POST(request: Request, { params }: Context) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    const { id, caseId } = await params;
    const body = (await request.json().catch(() => null)) as
      | { type?: EvidenceType; content?: string; url?: string; caseName?: string }
      | null;
    if (!body?.type || !TYPES.includes(body.type)) {
      return NextResponse.json({ error: "type must be note, link or screenshot." }, { status: 400 });
    }
    if (body.type === "note" && !body.content?.trim()) {
      return NextResponse.json({ error: "A note needs some text." }, { status: 400 });
    }
    if (body.type === "link" && !body.url?.trim()) {
      return NextResponse.json({ error: "A link needs a URL." }, { status: 400 });
    }
    if (body.type === "screenshot" && !body.content?.startsWith("data:image/")) {
      return NextResponse.json({ error: "A screenshot must be an image." }, { status: 400 });
    }
    if ((body.content?.length ?? 0) > MAX_CONTENT_BYTES) {
      return NextResponse.json({ error: "Attachment is too large (max ~8MB)." }, { status: 413 });
    }

    const investigation = getOrCreateInvestigation(id, caseId, body.caseName ?? null, guard.id);
    const evidence = addEvidence(
      investigation.id,
      body.type,
      body.content ?? null,
      body.url ?? null,
      guard.id,
    );
    return NextResponse.json({ evidence });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    await params;
    const evidenceId = new URL(request.url).searchParams.get("evidenceId");
    if (!evidenceId) return NextResponse.json({ error: "evidenceId is required." }, { status: 400 });
    deleteEvidence(evidenceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
