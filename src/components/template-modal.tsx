"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cellText, type Row } from "@/lib/table-export";
import { defaultMutable, type ConnectorTemplate } from "@/lib/connector-templates";

/** Top-level connector fields that may be marked mutable (everything else is fixed per clone). */
const SELECTABLE_TOP = ["filter_list", "name", "run_on"];

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
  const [configOpen, setConfigOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMutable = (key: string, hintFrom = key) => mutable[key] ?? (editing ? false : defaultMutable(hintFrom));
  const toggle = (key: string, hintFrom = key) =>
    setMutable((prev) => ({ ...prev, [key]: !isMutable(key, hintFrom) }));

  const selected = useMemo(() => {
    const top = SELECTABLE_TOP.filter((key) => isMutable(key));
    const config = configEntries.filter(([sub]) => isMutable(`configuration.${sub}`, sub)).map(([sub]) => `configuration.${sub}`);
    return [...top, ...config];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutable, configEntries]);

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
        <p className="text-[11px] text-sc-faint">Tick each field a clone should be able to change per tenant.</p>
        <span className="text-[11px] text-sc-muted">{selected.length} mutable</span>
      </div>

      <div className="mt-2 max-h-[48vh] overflow-y-auto rounded-lg border border-sc-border-soft">
        {SELECTABLE_TOP.map((key) => (
          <FieldRow
            key={key}
            label={key}
            value={cellText(connector[key])}
            checked={isMutable(key)}
            onToggle={() => toggle(key)}
          />
        ))}

        {configEntries.length > 0 ? (
          <div className="border-t border-sc-border-soft">
            <button
              type="button"
              onClick={() => setConfigOpen((open) => !open)}
              className="flex w-full items-center gap-1.5 bg-sc-raised/40 px-3 py-1.5 text-left text-[11px] font-medium text-sc-muted hover:text-sc-text"
            >
              {configOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              configuration
              <span className="text-sc-faint">({configEntries.length} fields)</span>
            </button>
            {configOpen
              ? configEntries.map(([sub, value]) => (
                  <FieldRow
                    key={sub}
                    label={sub}
                    value={cellText(value)}
                    checked={isMutable(`configuration.${sub}`, sub)}
                    onToggle={() => toggle(`configuration.${sub}`, sub)}
                    indent
                  />
                ))
              : null}
          </div>
        ) : null}
      </div>

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

function FieldRow({
  label,
  value,
  checked,
  onToggle,
  indent,
}: {
  label: string;
  value: string;
  checked: boolean;
  onToggle: () => void;
  indent?: boolean;
}) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-1.5 text-[11px] hover:bg-sc-active/50", indent && "pl-8")}>
      <input type="checkbox" checked={checked} onChange={onToggle} className="accent-sc-primary" />
      <span className="w-44 shrink-0 truncate text-sc-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-sc-text" title={value}>
        {value || "—"}
      </span>
    </label>
  );
}
