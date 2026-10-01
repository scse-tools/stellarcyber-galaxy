import { NextResponse } from "next/server";
import { createCustomSource, deleteSource, listSources, upsertSource } from "@/lib/investigation/sources-repo";
import { errorResponse } from "@/lib/api-error";
import { requireUser, requireAdmin, isGuardFailure } from "@/lib/auth/session";
import type { CustomSourceInput } from "@/lib/investigation/types";

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

/** Enable/disable a built-in source or set/clear its API key. */
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

/** Create a user-defined premium source. */
export async function POST(request: Request) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const body = (await request.json().catch(() => null)) as Partial<CustomSourceInput> | null;
    if (!body?.name || !body.urlTemplate || !Array.isArray(body.kinds) || body.kinds.length === 0) {
      return NextResponse.json({ error: "name, at least one kind, and a URL template are required." }, { status: 400 });
    }
    createCustomSource({
      name: body.name,
      kinds: body.kinds,
      urlTemplate: body.urlTemplate,
      authHeader: body.authHeader ?? null,
      apiKey: body.apiKey,
      enabled: body.enabled,
    });
    return NextResponse.json({ sources: listSources() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const key = new URL(request.url).searchParams.get("key");
    if (!key) return NextResponse.json({ error: "key is required." }, { status: 400 });
    deleteSource(key);
    return NextResponse.json({ sources: listSources() });
  } catch (error) {
    return errorResponse(error);
  }
}
