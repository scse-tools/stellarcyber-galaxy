import { NextResponse } from "next/server";
import { requireAdmin, isGuardFailure } from "@/lib/auth/session";
import { regenerateSelfSigned } from "@/lib/tls/cert-store";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    return NextResponse.json({ tls: regenerateSelfSigned() });
  } catch (error) {
    return errorResponse(error);
  }
}
