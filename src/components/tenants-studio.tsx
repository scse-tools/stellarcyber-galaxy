"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Plus, RefreshCw } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { ColumnPicker } from "@/components/column-picker";
import { TenantModal } from "@/components/tenant-modal";
import { TenantsTable } from "@/components/tenants-table";
import { TenantsImport } from "@/components/tenants-import";
import { sectionize } from "@/lib/inventory-columns";
import type { Row } from "@/lib/table-export";
import type { InstanceSummary } from "@/lib/types";

const COLS_KEY = "galaxy.tenantColumns";

function loadCols(): Record<string, boolean> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COLS_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function TenantsStudio({ instances, isAdmin }: { instances: InstanceSummary[]; isAdmin: boolean }) {
  const [selectedId, setSelectedId] = useState("");
  const [records, setRecords] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Row | null>(null);

  useEffect(() => setVisibility(loadCols()), []);

  const serverOptions = useMemo(
    () =>
      [...instances]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .map((instance) => ({ value: instance.id, label: instance.name })),
    [instances],
  );

  const loadRecords = useCallback(() => {
    if (!selectedId) {
      setRecords([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/instances/${selectedId}/tenants?full=1`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Could not load tenants.");
        setRecords(body.records ?? []);
      })
      .catch((thrown) => setError(thrown instanceof Error ? thrown.message : "Load failed."))
      .finally(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => loadRecords(), [loadRecords]);

  const allSections = useMemo(() => {
    const keys = new Set<string>();
    for (const row of records) for (const key of Object.keys(row)) keys.add(key);
    return sectionize([...keys], "");
  }, [records]);
  const allColumns = useMemo(() => allSections.flatMap((s) => s.columns), [allSections]);

  const isVisible = useCallback((column: string) => visibility[column] ?? true, [visibility]);
  const sections = useMemo(
    () => allSections.map((s) => ({ ...s, columns: s.columns.filter(isVisible) })).filter((s) => s.columns.length),
    [allSections, isVisible],
  );
  const columns = useMemo(() => sections.flatMap((s) => s.columns), [sections]);

  const toggleColumn = (column: string) =>
    setVisibility((prev) => {
      const next = { ...prev, [column]: !(prev[column] ?? true) };
      try {
        window.localStorage.setItem(COLS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  const resetColumns = () => {
    setVisibility({});
    try {
      window.localStorage.setItem(COLS_KEY, "{}");
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-sc-accent" />
          <SearchableSelect
            value={selectedId}
            onChange={setSelectedId}
            ariaLabel="Select a server"
            title="Reuses the saved server and API key"
            className="w-64 rounded-md border border-sc-border bg-sc-surface px-2 py-1.5 text-sm text-sc-text hover:bg-sc-active"
            options={[{ value: "", label: "Select a server…" }, ...serverOptions]}
          />
          {selectedId && !loading ? (
            <span className="text-xs text-sc-faint">{records.length} tenants</span>
          ) : null}
        </div>
        {selectedId ? (
          <div className="flex items-center gap-2">
            <Button onClick={loadRecords} disabled={loading}>
              <RefreshCw size={15} className={loading ? "animate-spin" : undefined} /> Refresh
            </Button>
            <ColumnPicker
              sections={allSections}
              isVisible={isVisible}
              onToggle={toggleColumn}
              onReset={resetColumns}
              visibleCount={columns.length}
              totalCount={allColumns.length}
            />
            {isAdmin ? (
              <Button variant="primary" onClick={() => { setEditingTenant(null); setModalOpen(true); }}>
                <Plus size={15} /> Create tenant
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-xs text-critical">{error}</p> : null}

      {!selectedId ? (
        <p className="rounded-lg border border-dashed border-sc-border bg-sc-surface/50 px-4 py-12 text-center text-sm text-sc-faint">
          Choose a server to create or modify its tenants.
        </p>
      ) : (
        <>
          <TenantsTable
            rows={records}
            columns={columns}
            onEdit={isAdmin ? (row) => { setEditingTenant(row); setModalOpen(true); } : undefined}
          />
          {isAdmin ? <TenantsImport instanceId={selectedId} /> : null}
        </>
      )}

      {modalOpen ? (
        <TenantModal
          instanceId={selectedId}
          tenant={editingTenant}
          onClose={() => setModalOpen(false)}
          onSaved={loadRecords}
        />
      ) : null}
    </section>
  );
}
