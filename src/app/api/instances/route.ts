import { NextResponse } from "next/server";
import { createInstance, listInstanceRows, toSummary } from "@/lib/instance-repo";
import { instanceInputSchema } from "@/lib/schemas";
import { errorResponse } from "@/lib/api-error";
import { requireUser, requireAdmin, isGuardFailure } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    return NextResponse.json({ instances: listInstanceRows().map(toSummary) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const parsed = instanceInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid instance.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json({ instance: toSummary(createInstance(parsed.data)) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
