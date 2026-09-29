"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CatalogTemplateSection } from "@/components/catalog-template-section";
import { type FieldValue } from "@/components/catalog-field-input";
import type { ConnectorTemplate } from "@/lib/connector-templates";
import type { ConnectorDefinition, DefinitionField } from "@/lib/connector-definitions";

const CONFIG_PREFIX = "configuration.";
const TOP_FIELDS: DefinitionField[] = [
  { fieldName: "name", displayName: "Name", type: "text", required: false, default: "" },
  { fieldName: "run_on", displayName: "Run on", type: "text", required: false, default: "dp" },
  { fieldName: "is_collect", displayName: "Collect", type: "boolean", required: false, default: false },
  { fieldName: "is_respond", displayName: "Respond", type: "boolean", required: false, default: false },
  { fieldName: "filter_list", displayName: "Filter list", type: "text", required: false, default: "[]" },
  { fieldName: "advanced_setting", displayName: "Advanced setting", type: "boolean", required: false, default: false },
];

function initialValue(field: DefinitionField): FieldValue {
  if (field.type === "boolean") return field.default === true;
  if (field.default !== null && typeof field.default === "object") return JSON.stringify(field.default);
  return field.default === undefined || field.default === null ? "" : String(field.default);
}

function toTyped(field: DefinitionField, value: FieldValue): unknown {
  if (field.type === "boolean") return value === true || value === "true";
  if (field.type === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  if (field.type === "list" || field.fieldName === "filter_list") {
    try {
      const parsed = JSON.parse(String(value));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return String(value ?? "");
}

/** Full form to create a connector template from a catalog definition (defaults + descriptions). */
export function CatalogTemplateForm({
  definition,
  onClose,
  onSaved,
}: {
  definition: ConnectorDefinition;
  onClose: () => void;
  onSaved: (template: ConnectorTemplate) => void;
}) {
  const top = useMemo(() => TOP_FIELDS.map((f) => ({ ...f, default: f.fieldName === "is_collect" ? definition.isCollect : f.fieldName === "is_respond" ? definition.isRespond : f.default })), [definition]);

  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, FieldValue>>(() => {
    const init: Record<string, FieldValue> = {};
    for (const field of top) init[field.fieldName] = initialValue(field);
    for (const field of definition.fields) init[`${CONFIG_PREFIX}${field.fieldName}`] = initialValue(field);
    return init;
  });
  const [mutable, setMutable] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const field of top) init[field.fieldName] = true;
    for (const field of definition.fields) init[`${CONFIG_PREFIX}${field.fieldName}`] = true;
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = Object.values(mutable).filter(Boolean).length;
  const setValue = (key: string, value: FieldValue) => setValues((prev) => ({ ...prev, [key]: value }));
  const toggle = (key: string) => setMutable((prev) => ({ ...prev, [key]: !prev[key] }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const conf: Record<string, unknown> = {};
      for (const field of definition.fields) conf[field.fieldName] = toTyped(field, values[`${CONFIG_PREFIX}${field.fieldName}`]);
      const fields = {
        type: definition.type,
        category: definition.category,
        name: String(values.name ?? ""),
        run_on: String(values.run_on ?? "dp"),
        is_collect: values.is_collect === true,
        is_respond: values.is_respond === true,
        filter_list: toTyped(top[4], values.filter_list),
        advanced_setting: values.advanced_setting === true,
        configuration: JSON.stringify(conf),
      };
      const mutableFields = [
        ...top.filter((f) => mutable[f.fieldName]).map((f) => f.fieldName),
        ...definition.fields.filter((f) => mutable[`${CONFIG_PREFIX}${f.fieldName}`]).map((f) => `${CONFIG_PREFIX}${f.fieldName}`),
      ];
      const response = await fetch("/api/connector-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          instanceId: "",
          instanceName: "",
          connectorType: definition.type,
          connectorName: definition.displayName,
          fields,
          mutableFields,
          includeAllConfig: true,
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
      title={`New template · ${definition.displayName}`}
      description={`Keys: type=${definition.type} · category=${definition.category}. Tenant is set per clone by tenant_name (→ cust_id).`}
      onClose={onClose}
      className="max-w-[min(94vw,820px)]"
    >
      <label className="block">
        <span className="text-[11px] font-medium uppercase tracking-wide text-sc-faint">Template name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={`e.g. ${definition.displayName} onboarding`}
          className="mt-1 w-full rounded-md border border-sc-border bg-sc-surface px-2.5 py-1.5 text-sm text-sc-text focus:border-sc-link focus:outline-none"
        />
      </label>

      <p className="mt-3 text-[11px] text-sc-faint">
        Tick each field a clone may change per tenant; set the default values below. ({selectedCount} mutable)
      </p>

      <div className="mt-2 max-h-[52vh] space-y-4 overflow-y-auto pr-1">
        <CatalogTemplateSection title="Connector fields" fields={top} prefix="" values={values} mutable={mutable} onValue={setValue} onToggle={toggle} />
        <CatalogTemplateSection title="Configuration" fields={definition.fields} prefix={CONFIG_PREFIX} values={values} mutable={mutable} onValue={setValue} onToggle={toggle} />
      </div>

      {error ? <p className="mt-3 text-xs text-critical">{error}</p> : null}

      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={saving || !name.trim()}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          Save template
        </Button>
      </div>
    </Modal>
  );
}

