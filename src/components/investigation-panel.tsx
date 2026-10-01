"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, Settings, ShieldQuestion } from "lucide-react";
import { InvestigationRunView } from "@/components/investigation-run-view";
import { InvestigationPromptBox } from "@/components/investigation-prompt-box";
import { InvestigationEvidence } from "@/components/investigation-evidence";
import { ThreatIntelSources } from "@/components/investigation-threat-intel";
import { InvestigationSettingsModal } from "@/components/investigation-settings-modal";
import { cn } from "@/lib/utils";
import { providerNeedsKey, type Evidence, type Investigation, type LlmProvider, type Observable } from "@/lib/investigation/types";

type Tab = "investigate" | "evidence" | "sources";

interface Props {
  instanceId: string;
  caseId: string | null;
  caseName: string | null;
  selected: Observable[];
  isAdmin: boolean;
  onInvestigated: () => void;
}

export function InvestigationPanel({ instanceId, caseId, caseName, selected, isAdmin, onInvestigated }: Props) {
  const [tab, setTab] = useState<Tab>("investigate");
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [providerId, setProviderId] = useState<string>("");
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadProviders = useCallback(async () => {
    const body = await fetch("/api/settings/llm-providers").then((r) => r.json());
    const list: LlmProvider[] = body.providers ?? [];
    setProviders(list);
    setProviderId((current) => current || list.find((p) => p.isDefault)?.id || list[0]?.id || "");
  }, []);

  const loadInvestigation = useCallback(async () => {
    if (!caseId) return;
    const body = await fetch(`/api/instances/${instanceId}/cases/${encodeURIComponent(caseId)}/investigation`).then((r) => r.json());
    setInvestigation(body.investigation ?? null);
  }, [instanceId, caseId]);

  useEffect(() => void loadProviders(), [loadProviders]);
  useEffect(() => {
    setInvestigation(null);
    setError(null);
    void loadInvestigation();
  }, [loadInvestigation]);

  const run = async () => {
    if (!caseId || !providerId || selected.length === 0) return;
    setRunning(true);
    setError(null);
    try {
      const response = await fetch(`/api/instances/${instanceId}/cases/${encodeURIComponent(caseId)}/investigation/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, caseName, observables: selected }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Investigation failed.");
      await loadInvestigation();
      onInvestigated();
      setTab("investigate");
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Investigation failed.");
    } finally {
      setRunning(false);
    }
  };

  const addEvidence = async (type: Evidence["type"], payload: { content?: string; url?: string }) => {
    if (!caseId) return;
    setEvidenceBusy(true);
    try {
      await fetch(`/api/instances/${instanceId}/cases/${encodeURIComponent(caseId)}/investigation/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...payload, caseName }),
      });
      await loadInvestigation();
      onInvestigated();
    } finally {
      setEvidenceBusy(false);
    }
  };

  const removeEvidence = async (evId: string) => {
    if (!caseId) return;
    await fetch(
      `/api/instances/${instanceId}/cases/${encodeURIComponent(caseId)}/investigation/evidence?evidenceId=${evId}`,
      { method: "DELETE" },
    );
    await loadInvestigation();
  };

  const runs = investigation?.runs ?? [];
  const evidence = investigation?.evidence ?? [];

  return (
    <aside className="flex min-h-0 flex-col rounded-xl border border-sc-border-soft bg-sc-surface/50">
      <div className="flex items-center justify-between border-b border-sc-border-soft px-3 py-2">
        <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-sc-faint">
          <ShieldQuestion size={14} className="text-sc-accent" /> Threat Intel
        </span>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Investigation settings"
          className="rounded p-1 text-sc-faint hover:text-sc-text"
        >
          <Settings size={14} />
        </button>
      </div>

      <div className="flex border-b border-sc-border-soft text-[11px]">
        {(["investigate", "evidence", "sources"] as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 px-2 py-1.5 font-medium capitalize transition-colors",
              tab === id ? "border-b-2 border-sc-primary text-sc-text" : "text-sc-faint hover:text-sc-text",
            )}
          >
            {id}
            {id === "evidence" && evidence.length ? ` (${evidence.length})` : ""}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!caseId ? (
          <p className="text-[11px] text-sc-faint">Select a case to investigate.</p>
        ) : tab === "investigate" ? (
          <div className="space-y-3">
            <div className="space-y-2 rounded-lg border border-sc-border-soft bg-sc-surface p-2.5">
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="w-full rounded border border-sc-border bg-sc-surface px-2 py-1 text-xs text-sc-text focus:border-sc-primary focus:outline-none"
              >
                {providers.length === 0 ? <option value="">No LLM providers — add one in settings</option> : null}
                {providers.map((provider) => {
                  const missingKey = providerNeedsKey(provider.kind) && !provider.hasKey;
                  return (
                    <option key={provider.id} value={provider.id} disabled={missingKey}>
                      {provider.name} ({provider.kind}){missingKey ? " — no key" : ""}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                onClick={() => void run()}
                disabled={running || !providerId || selected.length === 0}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-sc-primary px-2 py-1.5 text-xs font-medium text-white disabled:opacity-40"
              >
                {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                {running ? "Investigating…" : `Investigate ${selected.length} selected`}
              </button>
              {selected.length === 0 ? (
                <p className="text-[10px] text-sc-faint">Select observables above to investigate them.</p>
              ) : null}
              {error ? <p className="text-[11px] text-critical">{error}</p> : null}
            </div>

            {runs.length === 0 ? (
              <p className="text-[11px] text-sc-faint">No investigations yet for this case.</p>
            ) : (
              <>
                <InvestigationRunView run={runs[0]} />
                {runs.length > 1 ? (
                  <details className="rounded-lg border border-sc-border-soft bg-sc-surface px-2.5 py-2">
                    <summary className="cursor-pointer text-[11px] font-medium text-sc-muted">
                      History ({runs.length - 1})
                    </summary>
                    <div className="mt-2 space-y-3 border-t border-sc-border-soft pt-2">
                      {runs.slice(1).map((r) => (
                        <InvestigationRunView key={r.id} run={r} />
                      ))}
                    </div>
                  </details>
                ) : null}
              </>
            )}

            <InvestigationPromptBox providerId={providerId} />
          </div>
        ) : tab === "evidence" ? (
          <InvestigationEvidence evidence={evidence} busy={evidenceBusy} onAdd={addEvidence} onDelete={removeEvidence} />
        ) : (
          <ThreatIntelSources />
        )}
      </div>

      <InvestigationSettingsModal
        open={settingsOpen}
        isAdmin={isAdmin}
        onClose={() => setSettingsOpen(false)}
        onChanged={() => void loadProviders()}
      />
    </aside>
  );
}
