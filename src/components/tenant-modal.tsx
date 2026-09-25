"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TENANT_FIELDS } from "@/lib/tenant-fields";

type FieldValue = string | boolean;

interface TenantModalProps {
  instanceId: string;
  /** The full tenant record to edit, or null to create a new tenant. */
  tenant: Record<string, unknown> | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Create a new tenant or modify an existing one directly via the /tenants API. */
export function TenantModal({ instanceId, tenant, onClose, onSaved }: TenantModalProps) {
  const editing = Boolean(tenant);
  const [values, setValues] = useState<Record<string, FieldValue>>(() => {
    const initial: Record<string, FieldValue> = {};
    for (const field of TENANT_FIELDS) {
      const raw = tenant?.[field.key];
      initial[field.key] = field.type === "boolean" ? raw === true : raw === undefined || raw === null ? "" : String(raw);
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const custName = String(values.cust_name ?? "").trim();

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const custId = tenant ? String(tenant.cust_id ?? "") : "";
      const url = editing
        ? `/api/instances/${instanceId}/tenants/${encodeURIComponent(custId)}`
        : `/api/instances/${instanceId}/tenants`;
      const response = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) {
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }
      onSaved();
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
      title={editing ? `Modify tenant · ${custName || "tenant"}` : "Create tenant"}
      description="Fields left blank are omitted from the request."
      onClose={onClose}
      className="max-w-[min(94vw,640px)]"
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {TENANT_FIELDS.map((field) => (
          <label key={field.key} className="block text-[11px]">
            <span className="font-medium uppercase tracking-wide text-sc-faint">
              {field.label}
              {field.required ? <span className="text-critical"> *</span> : null}
            </span>
            {field.type === "boolean" ? (
              <span className="mt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={values[field.key] === true}
                  onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.checked }))}
                  className="accent-sc-primary"
                />
                <span className="text-sc-muted">Enabled</span>
              </span>
            ) : (
              <input
                type={field.type === "number" ? "number" : "text"}
                value={String(values[field.key] ?? "")}
                onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                className="mt-1 w-full rounded-md border border-sc-border bg-sc-surface px-2 py-1.5 text-sm text-sc-text focus:border-sc-link focus:outline-none"
              />
            )}
          </label>
        ))}
      </div>

      {error ? <p className="mt-3 text-xs text-critical">{error}</p> : null}

      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={saving || !custName}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {editing ? "Save changes" : "Create tenant"}
        </Button>
      </div>
    </Modal>
  );
}
