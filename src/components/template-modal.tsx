"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TemplateFieldPicker, SELECTABLE_TOP } from "@/components/template-field-picker";
import { defaultMutable, type ConnectorTemplate } from "@/lib/connector-templates";
import type { Row } from "@/lib/table-export";

const CONFIG_PREFIX = "configuration.";

interface TemplateModalProps {
  connector: Row | null;
  instanceId: string;
  instanceName: string;
  /** When set, the modal edits this existing template instead of creating a new one. */
  existing?: ConnectorTemplate | null;
  onClose: () => void;
  onSaved: (template: ConnectorTemplate) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Names a template and marks which fields are mutable — the top-level three plus config subfields. */
export function TemplateModal({ connector, instanceId, instanceName, existing, onClose, onSaved }: TemplateModalProps) {
  const editing = Boolean(existing);

  const configEntries = useMemo<[string, unknown][]>(() => {
    const raw = connector?.configuration;
    let parsed: unknown = raw;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }
    return isRecord(parsed) ? Object.entries(parsed).sort((a, b) => a[0].localeCompare(b[0])) : [];
  }, [connector]);

  const [name, setName] = useState(existing?.name ?? "");
  // In edit mode start from the saved selection exactly; in create mode fall back to the heuristic.
  const [mutable, setMutable] = useState<Record<string, boolean>>(() =>
    existing ? Object.fromEntries(existing.mutableFields.map((key) => [key, true])) : {},
  );
  // Custom config fields (not on the source connector) — seeded from an edited template's extras.
  const [added, setAdded] = useState<string[]>(() => {
    if (!existing) return [];
    const known = new Set(configEntries.map(([sub]) => sub));
    return existing.mutableFields
      .filter((key) => key.startsWith(CONFIG_PREFIX))
      .map((key) => key.slice(CONFIG_PREFIX.length))
      .filter((sub) => !known.has(sub));
  });
  const [configOpen, setConfigOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMutable = (key: string, hintFrom = key) => mutable[key] ?? (editing ? false : defaultMutable(hintFrom));
  const toggle = (key: string, hintFrom = key) => setMutable((prev) => ({ ...prev, [key]: !isMutable(key, hintFrom) }));

  const addField = (sub: string) => {
    if (configEntries.some(([key]) => key === sub) || added.includes(sub)) return;
    setAdded((prev) => [...prev, sub]);
    setMutable((prev) => ({ ...prev, [`${CONFIG_PREFIX}${sub}`]: true }));
  };
  const removeField = (sub: string) => {
    setAdded((prev) => prev.filter((key) => key !== sub));
    setMutable((prev) => {
      const next = { ...prev };
      delete next[`${CONFIG_PREFIX}${sub}`];
      return next;
    });
  };

  const selected = useMemo(() => {
    const keys = new Set<string>();
    for (const key of SELECTABLE_TOP) if (isMutable(key)) keys.add(key);
    for (const [sub] of configEntries) if (isMutable(`${CONFIG_PREFIX}${sub}`, sub)) keys.add(`${CONFIG_PREFIX}${sub}`);
    for (const sub of added) if (isMutable(`${CONFIG_PREFIX}${sub}`, sub)) keys.add(`${CONFIG_PREFIX}${sub}`);
    return [...keys];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutable, configEntries, added]);

  if (!connector) return null;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        existing ? `/api/connector-templates/${existing.id}` : "/api/connector-templates",
        {
          method: existing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            existing
              ? { name: name.trim(), mutableFields: selected }
              : {
                  name: name.trim(),
                  instanceId,
                  instanceName,
                  connectorType: String(connector.type ?? ""),
                  connectorName: String(connector.name ?? ""),
                  fields: connector,
                  mutableFields: selected,
                },
          ),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not save template.");
      onSaved(body.template as ConnectorTemplate);
      onClose();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={editing ? "Edit template" : "Select as template"}
      description={`From ${String(connector.name ?? "connector")} · ${String(connector.type ?? "")}`}
      onClose={onClose}
      className="max-w-[min(94vw,760px)]"
    >
      <label className="block">
        <span className="text-[11px] font-medium uppercase tracking-wide text-sc-faint">Template name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. SentinelOne onboarding"
          className="mt-1 w-full rounded-md border border-sc-border bg-sc-surface px-2.5 py-1.5 text-sm text-sc-text focus:border-sc-link focus:outline-none"
        />
      </label>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[11px] text-sc-faint">Tick each field a clone should change; add missing config fields (api_key, secrets, …).</p>
        <span className="text-[11px] text-sc-muted">{selected.length} mutable</span>
      </div>

      <TemplateFieldPicker
        connector={connector}
        configEntries={configEntries}
        added={added}
        isMutable={isMutable}
        onToggle={toggle}
        onAddField={addField}
        onRemoveField={removeField}
        open={configOpen}
        onToggleOpen={() => setConfigOpen((open) => !open)}
      />

      {error ? <p className="mt-3 text-xs text-critical">{error}</p> : null}

      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={saving || !name.trim() || selected.length === 0}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {editing ? "Save changes" : "Save template"}
        </Button>
      </div>
    </Modal>
  );
}
