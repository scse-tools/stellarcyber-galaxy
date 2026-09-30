"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { ProviderForm, type ProviderDraft } from "@/components/investigation-provider-form";
import type { LlmProvider, TiSource } from "@/lib/investigation/types";

const EMPTY: ProviderDraft = { name: "", kind: "anthropic", model: "", baseUrl: "", apiKey: "", isDefault: false };

interface Props {
  open: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function InvestigationSettingsModal({ open, isAdmin, onClose, onChanged }: Props) {
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [sources, setSources] = useState<TiSource[]>([]);
  const [draft, setDraft] = useState<ProviderDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([
      fetch("/api/settings/llm-providers").then((r) => r.json()),
      fetch("/api/settings/ti-sources").then((r) => r.json()),
    ]);
    setProviders(p.providers ?? []);
    setSources(s.sources ?? []);
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const saveProvider = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const url = draft.id ? `/api/settings/llm-providers/${draft.id}` : "/api/settings/llm-providers";
      const response = await fetch(url, {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          kind: draft.kind,
          model: draft.model,
          baseUrl: draft.baseUrl || null,
          apiKey: draft.apiKey || undefined,
          isDefault: draft.isDefault,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Save failed.");
      setDraft(null);
      await load();
      onChanged();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const removeProvider = async (id: string) => {
    if (!window.confirm("Delete this LLM provider?")) return;
    await fetch(`/api/settings/llm-providers/${id}`, { method: "DELETE" });
    await load();
    onChanged();
  };

  const saveSource = async (key: string, patch: { enabled?: boolean; apiKey?: string }) => {
    await fetch("/api/settings/ti-sources", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, ...patch }),
    });
    await load();
  };

  return (
    <Modal open={open} title="Investigation settings" onClose={onClose} className="max-w-2xl">
      {!isAdmin ? (
        <p className="text-sm text-sc-faint">Only admins can change these settings.</p>
      ) : (
        <div className="space-y-6">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-sc-text">LLM providers</h3>
              {!draft ? (
                <Button variant="primary" onClick={() => setDraft({ ...EMPTY })}>
                  Add provider
                </Button>
              ) : null}
            </div>

            {draft ? (
              <ProviderForm
                draft={draft}
                busy={busy}
                error={error}
                onChange={setDraft}
                onSave={() => void saveProvider()}
                onCancel={() => setDraft(null)}
              />
            ) : (
              <ul className="space-y-1.5">
                {providers.length === 0 ? (
                  <li className="text-xs text-sc-faint">No providers yet. Add Claude, ChatGPT, Gemini or a custom endpoint.</li>
                ) : (
                  providers.map((provider) => (
                    <li
                      key={provider.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-sc-border-soft bg-sc-surface px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-sc-text">
                          {provider.name}
                          {provider.isDefault ? <span className="ml-1.5 text-[10px] text-sc-accent">default</span> : null}
                          {!provider.hasKey ? <span className="ml-1.5 text-[10px] text-high">no key</span> : null}
                        </p>
                        <p className="text-[10px] text-sc-faint">
                          {provider.kind} · {provider.model}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button onClick={() => setDraft({ ...provider, baseUrl: provider.baseUrl ?? "", apiKey: "" })}>
                          Edit
                        </Button>
                        <button
                          type="button"
                          onClick={() => void removeProvider(provider.id)}
                          aria-label="Delete provider"
                          className="rounded p-1.5 text-sc-faint hover:text-critical"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-sc-text">Threat-intel sources</h3>
            <p className="mb-2 text-[11px] text-sc-faint">
              Add an API key and enable a source to query it live; the AI agent covers everything else.
            </p>
            <ul className="space-y-1.5">
              {sources.map((source) => (
                <SourceRow key={source.key} source={source} onSave={saveSource} />
              ))}
            </ul>
          </section>
        </div>
      )}
    </Modal>
  );
}

function SourceRow({
  source,
  onSave,
}: {
  source: TiSource;
  onSave: (key: string, patch: { enabled?: boolean; apiKey?: string }) => Promise<void>;
}) {
  const [apiKey, setApiKey] = useState("");
  return (
    <li className="flex items-center gap-2 rounded-lg border border-sc-border-soft bg-sc-surface px-3 py-2">
      <label className="flex flex-1 items-center gap-2 text-xs text-sc-text">
        <input
          type="checkbox"
          checked={source.enabled}
          onChange={(e) => void onSave(source.key, { enabled: e.target.checked })}
          className="accent-sc-primary"
        />
        {source.name}
        {source.hasKey ? <span className="text-[10px] text-[var(--severity-success)]">key set</span> : null}
      </label>
      <Input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={source.hasKey ? "replace key…" : "API key"}
        className="w-40"
      />
      <Button
        onClick={async () => {
          if (!apiKey.trim()) return;
          await onSave(source.key, { apiKey: apiKey.trim() });
          setApiKey("");
        }}
      >
        Save
      </Button>
    </li>
  );
}
