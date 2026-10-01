"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { CustomSourceInput, TiSource } from "@/lib/investigation/types";
import type { ObservableKind } from "@/lib/observables";

const KIND_OPTIONS: { kind: ObservableKind; label: string }[] = [
  { kind: "ip_public", label: "Public IP" },
  { kind: "ip_private", label: "Private IP" },
  { kind: "domain", label: "Domain" },
  { kind: "hostname", label: "Hostname" },
  { kind: "url", label: "URL" },
  { kind: "hash", label: "Hash" },
  { kind: "email", label: "Email" },
  { kind: "username", label: "Username" },
  { kind: "filename", label: "File name" },
];

interface Props {
  sources: TiSource[];
  onSave: (key: string, patch: { enabled?: boolean; apiKey?: string }) => Promise<void>;
  onCreate: (input: CustomSourceInput) => Promise<void>;
  onDelete: (key: string) => Promise<void>;
}

export function InvestigationSourcesSettings({ sources, onSave, onCreate, onDelete }: Props) {
  const keyless = sources.filter((s) => s.tier === "keyless");
  const premium = sources.filter((s) => s.tier === "premium");
  const custom = sources.filter((s) => s.tier === "custom");

  return (
    <div className="space-y-4">
      <SourceGroup title="Keyless — always available" hint="These run out of the box with no API key.">
        {keyless.map((source) => (
          <KeylessRow key={source.key} source={source} onSave={onSave} />
        ))}
      </SourceGroup>

      <SourceGroup title="Premium — add a key to activate">
        {premium.map((source) => (
          <KeyedRow key={source.key} source={source} onSave={onSave} />
        ))}
      </SourceGroup>

      <SourceGroup title="Custom sources">
        {custom.length === 0 ? <li className="text-[11px] text-sc-faint">No custom sources yet.</li> : null}
        {custom.map((source) => (
          <KeyedRow key={source.key} source={source} onSave={onSave} onDelete={onDelete} />
        ))}
        <CustomSourceForm onCreate={onCreate} />
      </SourceGroup>
    </div>
  );
}

/** Fires a live connectivity check against one source and shows the result inline. */
function SourceTest({ sourceKey }: { sourceKey: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const test = async () => {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/settings/ti-sources/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: sourceKey }),
      });
      const body = await response.json();
      setResult({ ok: Boolean(body.ok), text: body.message ?? body.error ?? "Test failed." });
    } catch (error) {
      setResult({ ok: false, text: error instanceof Error ? error.message : "Test failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button onClick={() => void test()} disabled={busy}>
        {busy ? <Loader2 size={13} className="animate-spin" /> : "Test"}
      </Button>
      {result ? (
        <span
          className={`flex w-full items-start gap-1 text-[10px] ${result.ok ? "text-[var(--severity-success)]" : "text-critical"}`}
        >
          {result.ok ? <CheckCircle2 size={11} className="mt-0.5 shrink-0" /> : <XCircle size={11} className="mt-0.5 shrink-0" />}
          <span className="break-words">{result.text}</span>
        </span>
      ) : null}
    </>
  );
}

function SourceGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-xs font-semibold text-sc-text">{title}</h4>
      {hint ? <p className="mb-1.5 text-[10px] text-sc-faint">{hint}</p> : null}
      <ul className="space-y-1.5">{children}</ul>
    </section>
  );
}

function KeylessRow({ source, onSave }: { source: TiSource; onSave: Props["onSave"] }) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-sc-border-soft bg-sc-surface px-3 py-2">
      <label className="flex flex-1 items-center gap-2 text-xs text-sc-text">
        <input
          type="checkbox"
          checked={source.enabled}
          onChange={(e) => void onSave(source.key, { enabled: e.target.checked })}
          className="accent-sc-primary"
        />
        {source.name}
      </label>
      <span className="text-[10px] text-[var(--severity-success)]">no key needed</span>
      <SourceTest sourceKey={source.key} />
    </li>
  );
}

function KeyedRow({
  source,
  onSave,
  onDelete,
}: {
  source: TiSource;
  onSave: Props["onSave"];
  onDelete?: Props["onDelete"];
}) {
  const [apiKey, setApiKey] = useState("");
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-sc-border-soft bg-sc-surface px-3 py-2">
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
        className="w-36"
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
      <SourceTest sourceKey={source.key} />
      {onDelete ? (
        <button
          type="button"
          onClick={() => void onDelete(source.key)}
          aria-label="Delete source"
          className="rounded p-1 text-sc-faint hover:text-critical"
        >
          <Trash2 size={14} />
        </button>
      ) : null}
    </li>
  );
}

function CustomSourceForm({ onCreate }: { onCreate: Props["onCreate"] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [urlTemplate, setUrlTemplate] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [kinds, setKinds] = useState<Set<ObservableKind>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const toggleKind = (kind: ObservableKind) =>
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });

  const submit = async () => {
    setError(null);
    if (!name.trim() || !urlTemplate.includes("{value}") || kinds.size === 0) {
      setError("Name, at least one type, and a URL template containing {value} are required.");
      return;
    }
    await onCreate({
      name: name.trim(),
      kinds: [...kinds],
      urlTemplate: urlTemplate.trim(),
      authHeader: authHeader.trim() || null,
      apiKey: apiKey.trim() || undefined,
    });
    setName("");
    setUrlTemplate("");
    setAuthHeader("");
    setApiKey("");
    setKinds(new Set());
    setOpen(false);
  };

  if (!open) {
    return (
      <li>
        <Button onClick={() => setOpen(true)}>Add custom source</Button>
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded-lg border border-sc-border bg-sc-surface p-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My TI feed" />
        </Field>
        <Field label="Auth header (optional)">
          <Input value={authHeader} onChange={(e) => setAuthHeader(e.target.value)} placeholder="x-api-key" />
        </Field>
      </div>
      <Field label="URL template (use {value})">
        <Input value={urlTemplate} onChange={(e) => setUrlTemplate(e.target.value)} placeholder="https://api.example.com/lookup?q={value}" />
      </Field>
      <Field label="API key (optional)">
        <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="key" />
      </Field>
      <div>
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-sc-faint">Applies to</p>
        <div className="flex flex-wrap gap-1">
          {KIND_OPTIONS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              onClick={() => toggleKind(kind)}
              className={`rounded border px-1.5 py-0.5 text-[11px] ${
                kinds.has(kind) ? "border-sc-primary bg-sc-primary/15 text-sc-text" : "border-sc-border text-sc-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {error ? <p className="text-[11px] text-critical">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="primary" onClick={() => void submit()}>
          Add source
        </Button>
      </div>
    </li>
  );
}
