"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { displayCell } from "@/lib/inventory-columns";
import { defaultMutable, type ConnectorTemplate } from "@/lib/connector-templates";
import type { Row } from "@/lib/table-export";

interface TemplateModalProps {
  connector: Row | null;
  instanceId: string;
  instanceName: string;
  onClose: () => void;
  onSaved: (template: ConnectorTemplate) => void;
}

/** Names a template and marks which connector fields are mutable (cloneable per tenant). */
export function TemplateModal({ connector, instanceId, instanceName, onClose, onSaved }: TemplateModalProps) {
  const fields = useMemo(() => (connector ? Object.keys(connector).sort() : []), [connector]);
  const [name, setName] = useState("");
  const [mutable, setMutable] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMutable = (field: string) => mutable[field] ?? defaultMutable(field);
  const selectedCount = fields.filter(isMutable).length;

  if (!connector) return null;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/connector-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          instanceId,
          instanceName,
          connectorType: String(connector.type ?? ""),
          connectorName: String(connector.name ?? ""),
          fields: connector,
          mutableFields: fields.filter(isMutable),
        }),
      });
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
      title="Select as template"
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
        <p className="text-[11px] text-sc-faint">
          Tick each field that a clone should be able to change (URL, credentials, tenant, …).
        </p>
        <span className="text-[11px] text-sc-muted">{selectedCount} mutable</span>
      </div>

      <div className="mt-2 max-h-[46vh] divide-y divide-sc-border-soft overflow-y-auto rounded-lg border border-sc-border-soft">
        {fields.map((field) => (
          <label key={field} className="flex cursor-pointer items-center gap-3 px-3 py-1.5 text-[11px] hover:bg-sc-active/50">
            <input
              type="checkbox"
              checked={isMutable(field)}
              onChange={() => setMutable((prev) => ({ ...prev, [field]: !isMutable(field) }))}
              className="accent-sc-primary"
            />
            <span className="w-44 shrink-0 truncate text-sc-muted">{field}</span>
            <span className="min-w-0 flex-1 truncate text-right text-sc-text" title={displayCell(field, connector[field])}>
              {displayCell(field, connector[field]) || "—"}
            </span>
          </label>
        ))}
      </div>

      {error ? <p className="mt-3 text-xs text-critical">{error}</p> : null}

      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          onClick={save}
          disabled={saving || !name.trim() || selectedCount === 0}
          className={cn(saving && "opacity-70")}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          Save template
        </Button>
      </div>
    </Modal>
  );
}
