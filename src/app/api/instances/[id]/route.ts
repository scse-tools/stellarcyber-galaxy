import { NextResponse } from "next/server";
import { deleteInstance, toSummary, updateInstance } from "@/lib/instance-repo";
import { instanceUpdateSchema } from "@/lib/schemas";
import { errorResponse } from "@/lib/api-error";
import { requireAdmin, isGuardFailure } from "@/lib/auth/session";
import { forgetRestAccessToken } from "@/lib/rest/access-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const { id } = await params;
    const parsed = instanceUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid instance.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const updated = updateInstance(id, parsed.data);
    if (!updated) return NextResponse.json({ error: "Instance not found." }, { status: 404 });
    return NextResponse.json({ instance: toSummary(updated) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const { id } = await params;
    if (!deleteInstance(id)) {
      return NextResponse.json({ error: "Instance not found." }, { status: 404 });
    }
    forgetRestAccessToken(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
