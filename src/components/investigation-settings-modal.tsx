"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ProviderForm, type ProviderDraft } from "@/components/investigation-provider-form";
import { InvestigationSourcesSettings } from "@/components/investigation-sources-settings";
import type { CustomSourceInput, LlmProvider, TiSource } from "@/lib/investigation/types";

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

  const createSource = async (input: CustomSourceInput) => {
    await fetch("/api/settings/ti-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await load();
  };

  const removeSource = async (key: string) => {
    if (!window.confirm("Delete this custom source?")) return;
    await fetch(`/api/settings/ti-sources?key=${encodeURIComponent(key)}`, { method: "DELETE" });
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
              Keyless sources run automatically. Add a key to activate premium sources, or add your own.
            </p>
            <InvestigationSourcesSettings
              sources={sources}
              onSave={saveSource}
              onCreate={createSource}
              onDelete={removeSource}
            />
          </section>
        </div>
      )}
    </Modal>
  );
}
