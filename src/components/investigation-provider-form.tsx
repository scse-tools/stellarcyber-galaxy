"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { ProviderKind } from "@/lib/investigation/types";

export interface ProviderDraft {
  id?: string;
  name: string;
  kind: ProviderKind;
  model: string;
  baseUrl: string;
  apiKey: string;
  isDefault: boolean;
  hasKey?: boolean;
}

// Sensible default model per provider, shown as a placeholder hint.
const MODEL_HINT: Record<ProviderKind, string> = {
  anthropic: "claude-opus-4-8",
  openai: "gpt-4o",
  gemini: "gemini-1.5-pro",
  custom: "model name",
};

interface Props {
  draft: ProviderDraft;
  busy: boolean;
  error: string | null;
  onChange: (draft: ProviderDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ProviderForm({ draft, busy, error, onChange, onSave, onCancel }: Props) {
  const set = (patch: Partial<ProviderDraft>) => onChange({ ...draft, ...patch });

  return (
    <div className="space-y-3 rounded-lg border border-sc-border bg-sc-surface p-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name">
          <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Claude (prod)" />
        </Field>
        <Field label="Provider">
          <Select value={draft.kind} onChange={(e) => set({ kind: e.target.value as ProviderKind })}>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI (ChatGPT)</option>
            <option value="gemini">Google (Gemini)</option>
            <option value="custom">Custom (OpenAI-compatible)</option>
          </Select>
        </Field>
        <Field label="Model">
          <Input value={draft.model} onChange={(e) => set({ model: e.target.value })} placeholder={MODEL_HINT[draft.kind]} />
        </Field>
        <Field label={draft.kind === "custom" ? "Base URL (required)" : "Base URL (optional)"}>
          <Input value={draft.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} placeholder="https://…" />
        </Field>
      </div>
      <Field label={draft.hasKey ? "API key (leave blank to keep current)" : "API key"}>
        <Input
          type="password"
          value={draft.apiKey}
          onChange={(e) => set({ apiKey: e.target.value })}
          placeholder="sk-…"
        />
      </Field>
      <label className="flex items-center gap-2 text-xs text-sc-text">
        <input
          type="checkbox"
          checked={draft.isDefault}
          onChange={(e) => set({ isDefault: e.target.checked })}
          className="accent-sc-primary"
        />
        Use as the default provider
      </label>

      {error ? <p className="text-xs text-critical">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={onSave} disabled={busy || !draft.name || !draft.model}>
          {busy ? "Saving…" : "Save provider"}
        </Button>
      </div>
    </div>
  );
}
