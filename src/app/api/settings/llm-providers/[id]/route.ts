import { NextResponse } from "next/server";
import { deleteProvider, updateProvider } from "@/lib/investigation/providers-repo";
import { errorResponse } from "@/lib/api-error";
import { requireAdmin, isGuardFailure } from "@/lib/auth/session";
import type { LlmProviderInput, ProviderKind } from "@/lib/investigation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const KINDS: ProviderKind[] = ["anthropic", "openai", "gemini", "custom"];

export async function PATCH(request: Request, { params }: Context) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Partial<LlmProviderInput> | null;
    if (!body?.name || !body.model || !body.kind || !KINDS.includes(body.kind)) {
      return NextResponse.json({ error: "name, kind and model are required." }, { status: 400 });
    }
    const provider = updateProvider(id, {
      name: body.name,
      kind: body.kind,
      model: body.model,
      baseUrl: body.baseUrl ?? null,
      apiKey: body.apiKey,
      enabled: body.enabled,
      isDefault: body.isDefault,
    });
    if (!provider) return NextResponse.json({ error: "Provider not found." }, { status: 404 });
    return NextResponse.json({ provider });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const { id } = await params;
    deleteProvider(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
