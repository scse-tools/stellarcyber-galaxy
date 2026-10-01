import { NextResponse } from "next/server";
import { getProvider, getProviderApiKey } from "@/lib/investigation/providers-repo";
import { describeLlmError, runLlm } from "@/lib/investigation/llm";
import { errorResponse } from "@/lib/api-error";
import { requireUser, isGuardFailure } from "@/lib/auth/session";
import { providerNeedsKey } from "@/lib/investigation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

// The user's prompt is silently wrapped with this role so answers stay in an investigative frame.
const SYSTEM = [
  "You are a senior cybersecurity analyst performing security investigations in a SOC.",
  "Answer the analyst's question directly, accurately and concisely, with practical, actionable guidance.",
  "When indicators (IPs, domains, hashes, users, etc.) are involved, assess risk and recommend next steps.",
  "If something cannot be determined, say so plainly rather than speculating.",
].join(" ");

export async function POST(request: Request, { params }: Context) {
  try {
    const guard = await requireUser(request);
    if (isGuardFailure(guard)) return guard;
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { prompt?: string; context?: string } | null;
    if (!body?.prompt?.trim()) return NextResponse.json({ error: "A prompt is required." }, { status: 400 });

    const provider = getProvider(id);
    if (!provider) return NextResponse.json({ error: "Provider not found." }, { status: 404 });
    const apiKey = getProviderApiKey(id);
    if (providerNeedsKey(provider.kind) && !apiKey) {
      return NextResponse.json({ error: "The selected provider has no API key configured." }, { status: 400 });
    }

    // Give the model the case context (alert data + MITRE TTPs) ahead of the analyst's question.
    const prompt = body.context?.trim()
      ? `Case context for this investigation:\n${body.context}\n\n---\nAnalyst question: ${body.prompt}`
      : body.prompt;

    try {
      const text = await runLlm(provider, apiKey, { system: SYSTEM, prompt });
      return NextResponse.json({ text });
    } catch (thrown) {
      return NextResponse.json({ error: describeLlmError(thrown) }, { status: 502 });
    }
  } catch (error) {
    return errorResponse(error);
  }
}
