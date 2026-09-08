import { NextResponse } from "next/server";
import { cloneInstance, toSummary } from "@/lib/instance-repo";
import { requireAdmin, isGuardFailure } from "@/lib/auth/session";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** Duplicates an instance (URLs + API key retained). Admins only. */
export async function POST(request: Request, { params }: Context) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const { id } = await params;
    const clone = cloneInstance(id);
    if (!clone) return NextResponse.json({ error: "Instance not found." }, { status: 404 });
    return NextResponse.json({ instance: toSummary(clone) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
