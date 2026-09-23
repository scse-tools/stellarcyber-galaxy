import { NextResponse } from "next/server";
import { deleteTemplate } from "@/lib/connector-templates-repo";
import { errorResponse } from "@/lib/api-error";
import { requireAdmin, isGuardFailure } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Context) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const { id } = await params;
    deleteTemplate(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
