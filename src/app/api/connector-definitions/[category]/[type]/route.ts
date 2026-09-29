import { NextResponse } from "next/server";
import { getConnectorDefinition } from "@/lib/connector-definitions";
import { errorResponse } from "@/lib/api-error";
import { requireUser, isGuardFailure } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ category: string; type: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    const { category, type } = await params;
    const definition = getConnectorDefinition(decodeURIComponent(category), decodeURIComponent(type));
    if (!definition) return NextResponse.json({ error: "Connector definition not found." }, { status: 404 });
    return NextResponse.json({ definition });
  } catch (error) {
    return errorResponse(error);
  }
}
