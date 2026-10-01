"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { MarkdownLite } from "@/components/markdown-lite";
import { ttpLabel, type Ttp } from "@/lib/mitre";
import { providerNeedsKey, type LlmProvider } from "@/lib/investigation/types";

interface Props {
  ttps: Ttp[];
  instanceId: string;
  caseId: string | null;
  caseName: string | null;
  /** Called after the analysis is saved to the case, so the evidence list can refresh. */
  onSaved?: () => void;
}

/** Sends the case's observed TTPs to the LLM to identify patterns / likely threat actors. */
export function InvestigationTtpAnalysis({ ttps, instanceId, caseId, caseName, onSaved }: Props) {
  const [providerId, setProviderId] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  // Find a usable provider so the button only enables when an LLM is actually configured.
  useEffect(() => {
    void fetch("/api/settings/llm-providers")
      .then((r) => r.json())
      .then((b) => {
        const list: LlmProvider[] = b.providers ?? [];
        const usable = list.filter((p) => p.enabled && (!providerNeedsKey(p.kind) || p.hasKey));
        setProviderId(usable.find((p) => p.isDefault)?.id || usable[0]?.id || "");
      })
      .catch(() => setProviderId(""));
  }, []);

  // Has a threat-actor analysis already been run (and saved) for this case?
  useEffect(() => {
    setHasRun(false);
    if (!caseId) return;
    void fetch(`/api/instances/${instanceId}/cases/${encodeURIComponent(caseId)}/investigation`)
      .then((r) => r.json())
      .then((b) => {
        const evidence = b.investigation?.evidence ?? [];
        setHasRun(evidence.some((e: { type?: string }) => e.type === "analysis"));
      })
      .catch(() => setHasRun(false));
  }, [instanceId, caseId]);

  const analyze = async () => {
    if (!providerId || ttps.length === 0) return;
    setOpen(true);
    setBusy(true);
    setError(null);
    setAnswer(null);
    setSaved(false);
    const prompt = [
      "The following MITRE ATT&CK tactics and techniques were observed across the alerts in this security case:",
      ttps.map((t) => `- ${ttpLabel(t)}`).join("\n"),
      "",
      "Identify any meaningful patterns or attack-chain progression, and name any known threat actors / APT groups or malware families that commonly use this combination of TTPs. State your confidence and the reasoning. If the TTPs are too generic to attribute, say so plainly. Format the answer in Markdown with short sections.",
    ].join("\n");
    try {
      const response = await fetch(`/api/settings/llm-providers/${providerId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Request failed.");
      const text = body.text || "(empty response)";
      setAnswer(text);
      // Persist the analysis with the case so it can be viewed again later.
      if (caseId) {
        const content = `Threat actor / pattern analysis (TTPs: ${ttps.map(ttpLabel).join("; ")})\n\n${text}`;
        const save = await fetch(
          `/api/instances/${instanceId}/cases/${encodeURIComponent(caseId)}/investigation/evidence`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "analysis", content, caseName }),
          },
        );
        if (save.ok) {
          setSaved(true);
          setHasRun(true);
          onSaved?.();
        }
      }
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const disabled = !providerId || ttps.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => void analyze()}
        disabled={disabled}
        title={providerId ? "Identify patterns / threat actors from these TTPs" : "Configure an LLM provider to enable"}
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-40 ${
          hasRun
            ? "border-sc-border-soft bg-sc-active/50 text-sc-muted hover:text-sc-text"
            : "border-sc-border bg-sc-surface/70 text-sc-muted hover:bg-sc-active hover:text-sc-text"
        }`}
      >
        {hasRun ? <Check size={11} className="text-[var(--severity-success)]" /> : <Sparkles size={11} className="text-sc-accent" />}
        {hasRun ? "Identify threat actor · run again" : "Identify threat actor"}
      </button>

      <Modal open={open} title="Threat actor / pattern analysis" onClose={() => setOpen(false)} className="max-w-2xl">
        {busy ? (
          <p className="flex items-center gap-2 py-6 text-sm text-sc-faint">
            <Loader2 size={15} className="animate-spin" /> Analyzing {ttps.length} TTPs…
          </p>
        ) : error ? (
          <p className="rounded border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
        ) : answer ? (
          <div className="space-y-3">
            <MarkdownLite text={answer} />
            <p className="flex items-center gap-1.5 border-t border-sc-border-soft pt-2 text-[11px] text-sc-faint">
              {saved ? (
                <>
                  <Check size={12} className="text-[var(--severity-success)]" /> Saved to case evidence
                </>
              ) : (
                "Not saved (select a case to persist analyses)"
              )}
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
