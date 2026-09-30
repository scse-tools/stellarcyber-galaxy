import { proxiedFetch } from "@/lib/http";
import type { LlmProvider } from "@/lib/investigation/types";

const TIMEOUT_MS = Number(process.env.GALAXY_LLM_TIMEOUT_MS ?? 90_000);
const MAX_TOKENS = 4096;

export interface LlmRequest {
  system: string;
  prompt: string;
}

const rec = (value: unknown): Record<string, unknown> => (typeof value === "object" && value ? (value as Record<string, unknown>) : {});

/** Unwraps a fetch/Error into a readable message, surfacing the network cause behind "fetch failed". */
export function describeLlmError(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown error";
  const cause = (error as { cause?: { code?: string; message?: string } }).cause;
  const detail = cause?.code || cause?.message;
  return detail && detail !== error.message ? `${error.message} (${detail})` : error.message;
}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<Record<string, unknown>> {
  const response = await proxiedFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Provider HTTP ${response.status}: ${text.slice(0, 200)}`);
  try {
    return rec(JSON.parse(text));
  } catch {
    throw new Error("Provider returned a non-JSON response.");
  }
}

async function anthropic(provider: LlmProvider, apiKey: string, req: LlmRequest): Promise<string> {
  const base = provider.baseUrl || "https://api.anthropic.com";
  const body = await postJson(
    `${base}/v1/messages`,
    { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    { model: provider.model, max_tokens: MAX_TOKENS, system: req.system, messages: [{ role: "user", content: req.prompt }] },
  );
  const content = Array.isArray(body.content) ? body.content : [];
  return content
    .map((part) => (rec(part).type === "text" ? String(rec(part).text ?? "") : ""))
    .join("")
    .trim();
}

async function openaiCompatible(provider: LlmProvider, apiKey: string | null, req: LlmRequest, defaultBase: string): Promise<string> {
  const base = provider.baseUrl || defaultBase;
  const body = await postJson(
    `${base.replace(/\/$/, "")}/chat/completions`,
    apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    {
      model: provider.model,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.prompt },
      ],
    },
  );
  const choices = Array.isArray(body.choices) ? body.choices : [];
  return String(rec(rec(choices[0]).message).content ?? "").trim();
}

async function gemini(provider: LlmProvider, apiKey: string, req: LlmRequest): Promise<string> {
  const base = provider.baseUrl || "https://generativelanguage.googleapis.com";
  const url = `${base}/v1beta/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = await postJson(url, {}, {
    system_instruction: { parts: [{ text: req.system }] },
    contents: [{ role: "user", parts: [{ text: req.prompt }] }],
  });
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  const parts = Array.isArray(rec(rec(candidates[0]).content).parts) ? (rec(rec(candidates[0]).content).parts as unknown[]) : [];
  return parts.map((part) => String(rec(part).text ?? "")).join("").trim();
}

/** Calls the configured provider and returns its text output. */
export async function runLlm(provider: LlmProvider, apiKey: string | null, req: LlmRequest): Promise<string> {
  switch (provider.kind) {
    case "ollama":
      // Ollama's OpenAI-compatible endpoint; no key required.
      return openaiCompatible(provider, apiKey, req, "http://localhost:11434/v1");
    case "anthropic":
      return anthropic(provider, apiKey ?? "", req);
    case "openai":
      return openaiCompatible(provider, apiKey, req, "https://api.openai.com/v1");
    case "gemini":
      return gemini(provider, apiKey ?? "", req);
    case "custom":
      return openaiCompatible(provider, apiKey, req, provider.baseUrl || "https://api.openai.com/v1");
    default:
      throw new Error(`Unsupported provider kind: ${provider.kind}`);
  }
}
