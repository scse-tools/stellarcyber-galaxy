import { NextResponse } from "next/server";
import { deleteTemplate, updateTemplate } from "@/lib/connector-templates-repo";
import { errorResponse } from "@/lib/api-error";
import { requireAdmin, isGuardFailure } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as
      | { name?: unknown; mutableFields?: unknown }
      | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "A template name is required." }, { status: 400 });
    const mutableFields = Array.isArray(body?.mutableFields)
      ? body!.mutableFields.filter((field): field is string => typeof field === "string")
      : [];
    if (mutableFields.length === 0) {
      return NextResponse.json({ error: "Select at least one mutable field." }, { status: 400 });
    }
    const template = updateTemplate(id, { name, mutableFields });
    if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });
    return NextResponse.json({ template });
  } catch (error) {
    return errorResponse(error);
  }
}

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
