"use client";

import { useEffect, useMemo, useState } from "react";
import { Cable, FilePlus2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { ConnectorDetailModal } from "@/components/connector-detail-modal";
import { TemplateModal } from "@/components/template-modal";
import { StudioTemplatesTable } from "@/components/studio-templates-table";
import { StudioConnectorTable } from "@/components/studio-connector-table";
import { compareByColumn } from "@/lib/inventory-columns";
import type { Row } from "@/lib/table-export";
import type { ConnectorTemplate } from "@/lib/connector-templates";
import type { InstanceSummary } from "@/lib/types";

/** Connectors are listed by type, then tenant, then name. */
const SORT_KEYS = ["type", "tenant_name", "name"];

export function OnboardingStudio({ instances, isAdmin }: { instances: InstanceSummary[]; isAdmin: boolean }) {
  const [selectedId, setSelectedId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [templating, setTemplating] = useState(false);
  const [editing, setEditing] = useState<ConnectorTemplate | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [templates, setTemplates] = useState<ConnectorTemplate[]>([]);

  const upsertTemplate = (template: ConnectorTemplate) =>
    setTemplates((prev) =>
      prev.some((t) => t.id === template.id)
        ? prev.map((t) => (t.id === template.id ? template : t))
        : [template, ...prev],
    );

  const options = useMemo(
    () =>
      [...instances]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .map((instance) => ({ value: instance.id, label: instance.name })),
    [instances],
  );
  const selectedInstance = instances.find((instance) => instance.id === selectedId);

  useEffect(() => {
    fetch("/api/connector-templates")
      .then((response) => response.json())
      .then((body) => setTemplates(body.templates ?? []))
      .catch(() => setTemplates([]));
  }, []);

  useEffect(() => {
    setSelectedRow(null);
    if (!selectedId) {
      setRows([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/instances/${selectedId}/inventory`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Could not load connectors.");
        const connectors: Row[] = body.connectors ?? [];
        setRows(
          [...connectors].sort((a, b) => {
            for (const key of SORT_KEYS) {
              const cmp = compareByColumn(key, a[key], b[key]);
              if (cmp) return cmp;
            }
            return 0;
          }),
        );
        setError(body.connectorError ?? null);
      })
      .catch((thrown) => setError(thrown instanceof Error ? thrown.message : "Load failed."))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const deleteTemplate = async (template: ConnectorTemplate) => {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    await fetch(`/api/connector-templates/${template.id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== template.id));
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cable size={18} className="text-sc-accent" />
          <h2 className="text-lg font-semibold text-sc-text">Onboarding Studio</h2>
          {selectedId && !loading ? (
            <span className="text-xs text-sc-faint">
              {rows.length} connector{rows.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Button variant="primary" onClick={() => setTemplating(true)} disabled={!selectedRow}>
              <FilePlus2 size={15} /> Select as Template
            </Button>
          ) : null}
          <SearchableSelect
            value={selectedId}
            onChange={setSelectedId}
            ariaLabel="Select a server"
            title="Reuses the saved server and API key"
            className="w-64 rounded-md border border-sc-border bg-sc-surface px-2 py-1.5 text-sm text-sc-text hover:bg-sc-active"
            options={[{ value: "", label: "Select a server…" }, ...options]}
          />
        </div>
      </div>

      <StudioTemplatesTable
        templates={templates}
        canManage={isAdmin}
        onEdit={setEditing}
        onDelete={deleteTemplate}
      />

      {!selectedId ? (
        <p className="rounded-lg border border-dashed border-sc-border bg-sc-surface/50 px-4 py-12 text-center text-sm text-sc-faint">
          Choose a server to list its connectors, then pick one to save as a clone template.
        </p>
      ) : (
        <StudioConnectorTable
          rows={rows}
          loading={loading}
          error={error}
          selected={selectedRow}
          onSelect={setSelectedRow}
          onRowClick={setDetail}
        />
      )}

      {templating && selectedRow ? (
        <TemplateModal
          connector={selectedRow}
          instanceId={selectedId}
          instanceName={selectedInstance?.name ?? ""}
          onClose={() => setTemplating(false)}
          onSaved={(template) => {
            upsertTemplate(template);
            setSelectedRow(null);
          }}
        />
      ) : null}

      {editing ? (
        <TemplateModal
          connector={editing.fields}
          instanceId={editing.instanceId}
          instanceName={editing.instanceName}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={upsertTemplate}
        />
      ) : null}

      <ConnectorDetailModal connector={detail} onClose={() => setDetail(null)} />
    </section>
  );
}
