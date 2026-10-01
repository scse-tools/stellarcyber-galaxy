"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ttpLabel, type Ttp } from "@/lib/mitre";
import { providerNeedsKey, type LlmProvider } from "@/lib/investigation/types";

/** Sends the case's observed TTPs to the LLM to identify patterns / likely threat actors. */
export function InvestigationTtpAnalysis({ ttps }: { ttps: Ttp[] }) {
  const [providerId, setProviderId] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const analyze = async () => {
    if (!providerId || ttps.length === 0) return;
    setOpen(true);
    setBusy(true);
    setError(null);
    setAnswer(null);
    const prompt = [
      "The following MITRE ATT&CK tactics and techniques were observed across the alerts in this security case:",
      ttps.map((t) => `- ${ttpLabel(t)}`).join("\n"),
      "",
      "Identify any meaningful patterns or attack-chain progression, and name any known threat actors / APT groups or malware families that commonly use this combination of TTPs. State your confidence and the reasoning. If the TTPs are too generic to attribute, say so plainly.",
    ].join("\n");
    try {
      const response = await fetch(`/api/settings/llm-providers/${providerId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Request failed.");
      setAnswer(body.text || "(empty response)");
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
        className="inline-flex items-center gap-1 rounded-md border border-sc-border bg-sc-surface/70 px-2 py-0.5 text-[10px] font-medium text-sc-muted transition-colors hover:bg-sc-active hover:text-sc-text disabled:opacity-40"
      >
        <Sparkles size={11} className="text-sc-accent" />
        Identify threat actor
      </button>

      <Modal open={open} title="Threat actor / pattern analysis" onClose={() => setOpen(false)} className="max-w-2xl">
        {busy ? (
          <p className="flex items-center gap-2 py-6 text-sm text-sc-faint">
            <Loader2 size={15} className="animate-spin" /> Analyzing {ttps.length} TTPs…
          </p>
        ) : error ? (
          <p className="rounded border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
        ) : answer ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-sc-text">{answer}</p>
        ) : null}
      </Modal>
    </>
  );
}
