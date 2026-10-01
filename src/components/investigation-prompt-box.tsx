"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

/** Free-form prompt against the selected LLM, wrapped server-side with a cybersecurity-analyst role. */
export function InvestigationPromptBox({ providerId, context }: { providerId: string; context?: string }) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    if (!prompt.trim() || !providerId) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const response = await fetch(`/api/settings/llm-providers/${providerId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context }),
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

  return (
    <div className="space-y-2 rounded-lg border border-sc-border-soft bg-sc-surface p-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-sc-faint">
        <Sparkles size={12} className="text-sc-accent" /> Ask the analyst
      </p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void ask();
        }}
        placeholder="Ask anything — e.g. what does this attack technique mean, how do I triage this indicator…"
        rows={3}
        className="w-full resize-y rounded border border-sc-border bg-sc-surface px-2 py-1 text-xs text-sc-text placeholder:text-sc-faint focus:border-sc-primary focus:outline-none"
      />
      <button
        type="button"
        onClick={() => void ask()}
        disabled={busy || !prompt.trim() || !providerId}
        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-sc-primary px-2 py-1.5 text-xs font-medium text-white disabled:opacity-40"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        {busy ? "Thinking…" : "Ask"}
      </button>
      {error ? <p className="text-[11px] text-critical">{error}</p> : null}
      {answer ? (
        <div className="rounded border border-sc-border-soft bg-sc-active/40 px-2 py-1.5">
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-sc-text">{answer}</p>
        </div>
      ) : null}
    </div>
  );
}
