import type { ObservableKind } from "@/lib/observables";

export type ProviderKind = "anthropic" | "openai" | "gemini" | "custom";

/** A configured LLM provider. `hasKey` replaces the secret when sent to the browser. */
export interface LlmProvider {
  id: string;
  name: string;
  kind: ProviderKind;
  model: string;
  baseUrl: string | null;
  enabled: boolean;
  isDefault: boolean;
  hasKey: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LlmProviderInput {
  name: string;
  kind: ProviderKind;
  model: string;
  baseUrl?: string | null;
  apiKey?: string;
  enabled?: boolean;
  isDefault?: boolean;
}

export type SourceTier = "keyless" | "premium" | "custom";

/** A threat-intel source. Keyless sources run out of the box; premium/custom ones need a key. */
export interface TiSource {
  key: string;
  name: string;
  tier: SourceTier;
  kinds: ObservableKind[];
  enabled: boolean;
  hasKey: boolean;
  /** Custom sources only: the request template and auth header. */
  urlTemplate?: string | null;
  authHeader?: string | null;
  updatedAt: string | null;
}

export interface CustomSourceInput {
  name: string;
  kinds: ObservableKind[];
  urlTemplate: string;
  authHeader?: string | null;
  apiKey?: string;
  enabled?: boolean;
}

export interface Observable {
  kind: ObservableKind;
  value: string;
}

/** One source's (or the AI's) result for a single observable. */
export interface Finding {
  id: string;
  observableKind: ObservableKind;
  observableValue: string;
  /** Source key (e.g. "virustotal") or "ai" for model-derived findings. */
  source: string;
  verdict: string | null;
  summary: string | null;
  raw: unknown;
  createdAt: string;
}

export type RunStatus = "done" | "error";

/** One agentic enrichment run over a set of observables. */
export interface InvestigationRun {
  id: string;
  investigationId: string;
  providerId: string | null;
  providerLabel: string | null;
  model: string | null;
  observables: Observable[];
  status: RunStatus;
  summary: string | null;
  recommendation: string | null;
  verdict: string | null;
  error: string | null;
  createdBy: string | null;
  createdAt: string;
  findings: Finding[];
}

export type EvidenceType = "note" | "link" | "screenshot";

export interface Evidence {
  id: string;
  investigationId: string;
  type: EvidenceType;
  /** Note text, link caption, or screenshot data URL. */
  content: string | null;
  url: string | null;
  createdBy: string | null;
  createdAt: string;
}

/** A case's investigation session with all its runs and evidence. */
export interface Investigation {
  id: string;
  instanceId: string;
  caseId: string;
  caseName: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  runs: InvestigationRun[];
  evidence: Evidence[];
}
