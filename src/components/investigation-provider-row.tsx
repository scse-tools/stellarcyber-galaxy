"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { providerNeedsKey, type LlmProvider } from "@/lib/investigation/types";

interface Props {
  provider: LlmProvider;
  onEdit: (provider: LlmProvider) => void;
  onDelete: (id: string) => void;
}

type TestState = { ok: boolean; text: string } | null;

export function ProviderRow({ provider, onEdit, onDelete }: Props) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestState>(null);

  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      const response = await fetch(`/api/settings/llm-providers/${provider.id}/test`, { method: "POST" });
      const body = await response.json();
      setResult({ ok: Boolean(body.ok), text: body.ok ? body.message : (body.error ?? "Test failed.") });
    } catch (error) {
      setResult({ ok: false, text: error instanceof Error ? error.message : "Test failed." });
    } finally {
      setTesting(false);
    }
  };

  const missingKey = providerNeedsKey(provider.kind) && !provider.hasKey;

  return (
    <li className="rounded-lg border border-sc-border-soft bg-sc-surface px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-sc-text">
            {provider.name}
            {provider.isDefault ? <span className="ml-1.5 text-[10px] text-sc-accent">default</span> : null}
            {missingKey ? <span className="ml-1.5 text-[10px] text-high">no key</span> : null}
          </p>
          <p className="text-[10px] text-sc-faint">
            {provider.kind} · {provider.model}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button onClick={() => void test()} disabled={testing}>
            {testing ? <Loader2 size={13} className="animate-spin" /> : "Test"}
          </Button>
          <Button onClick={() => onEdit(provider)}>Edit</Button>
          <button
            type="button"
            onClick={() => onDelete(provider.id)}
            aria-label="Delete provider"
            className="rounded p-1.5 text-sc-faint hover:text-critical"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {result ? (
        <p
          className={`mt-1.5 flex items-start gap-1 text-[11px] ${
            result.ok ? "text-[var(--severity-success)]" : "text-critical"
          }`}
        >
          {result.ok ? <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> : <XCircle size={12} className="mt-0.5 shrink-0" />}
          <span className="break-words">{result.text}</span>
        </p>
      ) : null}
    </li>
  );
}
