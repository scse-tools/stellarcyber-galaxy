import { NextResponse } from "next/server";
import { listSources, upsertSource } from "@/lib/investigation/sources-repo";
import { errorResponse } from "@/lib/api-error";
import { requireUser, requireAdmin, isGuardFailure } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    return NextResponse.json({ sources: listSources() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const body = (await request.json().catch(() => null)) as
      | { key?: string; enabled?: boolean; apiKey?: string; clearKey?: boolean }
      | null;
    if (!body?.key) return NextResponse.json({ error: "key is required." }, { status: 400 });
    upsertSource(body.key, { enabled: body.enabled, apiKey: body.apiKey, clearKey: body.clearKey });
    return NextResponse.json({ sources: listSources() });
  } catch (error) {
    return errorResponse(error);
  }
}
