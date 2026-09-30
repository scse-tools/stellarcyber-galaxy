import { NextResponse } from "next/server";
import { getProvider, getProviderApiKey } from "@/lib/investigation/providers-repo";
import { describeLlmError, runLlm } from "@/lib/investigation/llm";
import { errorResponse } from "@/lib/api-error";
import { requireUser, isGuardFailure } from "@/lib/auth/session";
import { providerNeedsKey } from "@/lib/investigation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** Makes a tiny live call to confirm the provider is reachable and configured. */
export async function POST(request: Request, { params }: Context) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    const { id } = await params;
    const provider = getProvider(id);
    if (!provider) return NextResponse.json({ error: "Provider not found." }, { status: 404 });

    const apiKey = getProviderApiKey(id);
    if (providerNeedsKey(provider.kind) && !apiKey) {
      return NextResponse.json({ ok: false, error: "No API key configured." });
    }

    try {
      const text = await runLlm(provider, apiKey, {
        system: "You are a connectivity test. Answer in one word.",
        prompt: "Reply with the single word: OK",
      });
      return NextResponse.json({ ok: true, message: text.slice(0, 160) || "(empty response)" });
    } catch (thrown) {
      return NextResponse.json({ ok: false, error: describeLlmError(thrown) });
    }
  } catch (error) {
    return errorResponse(error);
  }
}
