import { NextResponse } from "next/server";
import { createProvider, listProviders } from "@/lib/investigation/providers-repo";
import { errorResponse } from "@/lib/api-error";
import { requireUser, requireAdmin, isGuardFailure } from "@/lib/auth/session";
import type { LlmProviderInput, ProviderKind } from "@/lib/investigation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: ProviderKind[] = ["ollama", "anthropic", "openai", "gemini", "custom"];

export async function GET(request: Request) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    return NextResponse.json({ providers: listProviders() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin(request);
    if (isGuardFailure(guard)) return guard;
    const body = (await request.json().catch(() => null)) as Partial<LlmProviderInput> | null;
    if (!body?.name || !body.model || !body.kind || !KINDS.includes(body.kind)) {
      return NextResponse.json({ error: "name, kind and model are required." }, { status: 400 });
    }
    const provider = createProvider({
      name: body.name,
      kind: body.kind,
      model: body.model,
      baseUrl: body.baseUrl ?? null,
      apiKey: body.apiKey,
      enabled: body.enabled,
      isDefault: body.isDefault,
    });
    return NextResponse.json({ provider });
  } catch (error) {
    return errorResponse(error);
  }
}
