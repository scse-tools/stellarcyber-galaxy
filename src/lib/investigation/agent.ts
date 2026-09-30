import { getProvider, getProviderApiKey } from "@/lib/investigation/providers-repo";
import { listActiveSources, type ActiveSource } from "@/lib/investigation/sources-repo";
import { fetchFromSource } from "@/lib/investigation/ti-fetch";
import { runLlm } from "@/lib/investigation/llm";
import { getOrCreateInvestigation, saveRun, type NewRun } from "@/lib/investigation/investigations-repo";
import type { Finding, InvestigationRun, Observable } from "@/lib/investigation/types";
import { getInvestigation } from "@/lib/investigation/investigations-repo";

type RawFinding = Omit<Finding, "id" | "createdAt">;

const SYSTEM = [
  "You are a senior SOC threat-intelligence analyst.",
  "You are given observables extracted from a security case, plus any live results already gathered from threat-intel sources.",
  "Assess each observable, then give an overall summary and a concrete recommendation for the analyst.",
  "Respond with STRICT JSON only (no markdown, no prose outside the JSON) matching:",
  '{"verdict":"malicious|suspicious|benign|inconclusive","summary":"...","recommendation":"...",',
  '"observables":[{"kind":"...","value":"...","verdict":"malicious|suspicious|benign|unknown","assessment":"..."}]}',
].join(" ");

/** Pulls the first balanced JSON object out of an LLM response. */
function parseJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Runs every active source that handles this observable's kind (hybrid enrichment). */
async function liveFindings(observable: Observable, active: ActiveSource[]): Promise<RawFinding[]> {
  const sources = active.filter((source) => source.kinds.includes(observable.kind));
  const results = await Promise.all(
    sources.map(async (source) => {
      const result = await fetchFromSource(source.key, observable.kind, observable.value, source.apiKey, source.custom);
      return {
        observableKind: observable.kind,
        observableValue: observable.value,
        source: source.key,
        verdict: result.verdict,
        summary: result.summary,
        raw: result.raw,
      } satisfies RawFinding;
    }),
  );
  return results;
}

function buildPrompt(observables: Observable[], sourceFindings: RawFinding[]): string {
  const lines = ["Observables:"];
  for (const observable of observables) lines.push(`- [${observable.kind}] ${observable.value}`);
  if (sourceFindings.length) {
    lines.push("", "Live threat-intel results:");
    for (const finding of sourceFindings) {
      lines.push(`- ${finding.source} · ${finding.observableValue}: ${finding.verdict} — ${finding.summary}`);
    }
  } else {
    lines.push("", "No live threat-intel source results are available; assess from your own knowledge.");
  }
  return lines.join("\n");
}

export interface RunResult {
  runId: string;
  run: InvestigationRun | null;
}

/**
 * Runs an agentic investigation over the selected observables: live source lookups (where keys are
 * configured) plus an LLM synthesis, then persists the run and its findings.
 */
export async function runInvestigation(params: {
  instanceId: string;
  caseId: string;
  caseName: string | null;
  providerId: string;
  observables: Observable[];
  userId: string | null;
}): Promise<RunResult> {
  const provider = getProvider(params.providerId);
  if (!provider) throw new Error("Selected LLM provider was not found.");
  const apiKey = getProviderApiKey(params.providerId);
  if (!apiKey) throw new Error("The selected LLM provider has no API key configured.");

  const investigation = getOrCreateInvestigation(params.instanceId, params.caseId, params.caseName, params.userId);
  const active = listActiveSources();

  // Hybrid step 1: gather live source findings for every observable.
  const sourceFindingGroups = await Promise.all(params.observables.map((observable) => liveFindings(observable, active)));
  const sourceFindings = sourceFindingGroups.flat();

  // Hybrid step 2: LLM synthesis over observables + live results.
  let summary: string | null = null;
  let recommendation: string | null = null;
  let verdict: string | null = null;
  let error: string | null = null;
  const aiFindings: RawFinding[] = [];

  try {
    const text = await runLlm(provider, apiKey, {
      system: SYSTEM,
      prompt: buildPrompt(params.observables, sourceFindings),
    });
    const parsed = parseJson(text);
    if (!parsed) {
      error = "The model did not return valid JSON.";
      summary = text.slice(0, 2000);
    } else {
      summary = typeof parsed.summary === "string" ? parsed.summary : null;
      recommendation = typeof parsed.recommendation === "string" ? parsed.recommendation : null;
      verdict = typeof parsed.verdict === "string" ? parsed.verdict : null;
      const observations = Array.isArray(parsed.observables) ? parsed.observables : [];
      for (const item of observations) {
        const o = item as Record<string, unknown>;
        if (typeof o.value !== "string") continue;
        const match = params.observables.find((obs) => obs.value === o.value);
        aiFindings.push({
          observableKind: match?.kind ?? params.observables[0]?.kind ?? "hostname",
          observableValue: o.value,
          source: "ai",
          verdict: typeof o.verdict === "string" ? o.verdict : null,
          summary: typeof o.assessment === "string" ? o.assessment : null,
          raw: null,
        });
      }
    }
  } catch (thrown) {
    error = thrown instanceof Error ? thrown.message : "LLM call failed.";
  }

  const newRun: NewRun = {
    investigationId: investigation.id,
    providerId: provider.id,
    providerLabel: `${provider.name} (${provider.kind})`,
    model: provider.model,
    observables: params.observables,
    status: error && !summary ? "error" : "done",
    summary,
    recommendation,
    verdict,
    error,
    createdBy: params.userId,
    findings: [...sourceFindings, ...aiFindings],
  };
  const runId = saveRun(newRun);
  const refreshed = getInvestigation(params.instanceId, params.caseId);
  return { runId, run: refreshed?.runs.find((run) => run.id === runId) ?? null };
}
