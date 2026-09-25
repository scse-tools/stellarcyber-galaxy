"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Pencil, Plus } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { TenantModal } from "@/components/tenant-modal";
import { TenantsImport } from "@/components/tenants-import";
import type { InstanceSummary, Tenant } from "@/lib/types";

export function TenantsStudio({ instances, isAdmin }: { instances: InstanceSummary[]; isAdmin: boolean }) {
  const [selectedId, setSelectedId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pickedTenantId, setPickedTenantId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const serverOptions = useMemo(
    () =>
      [...instances]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .map((instance) => ({ value: instance.id, label: instance.name })),
    [instances],
  );

  const loadTenants = useCallback(() => {
    if (!selectedId) {
      setTenants([]);
      return;
    }
    fetch(`/api/instances/${selectedId}/tenants`)
      .then((response) => response.json())
      .then((body) => setTenants(body.tenants ?? []))
      .catch(() => setTenants([]));
  }, [selectedId]);

  useEffect(() => {
    setPickedTenantId("");
    loadTenants();
  }, [loadTenants]);

  const modify = async () => {
    if (!pickedTenantId) return;
    setError(null);
    try {
      const response = await fetch(`/api/instances/${selectedId}/tenants/${encodeURIComponent(pickedTenantId)}`);
      const body = await response.json();
      if (!response.ok || !body.tenant) throw new Error(body.error ?? "Could not load tenant.");
      setEditingTenant(body.tenant);
      setModalOpen(true);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not load tenant.");
    }
  };

  return (
    <section className="space-y-3">
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
      </div>

      {!selectedId ? (
        <p className="rounded-lg border border-dashed border-sc-border bg-sc-surface/50 px-4 py-12 text-center text-sm text-sc-faint">
          Choose a server to create or modify its tenants.
        </p>
      ) : !isAdmin ? (
        <p className="text-sm text-sc-faint">Tenant creation and changes require an administrator.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={() => { setEditingTenant(null); setModalOpen(true); }}>
              <Plus size={15} /> Create tenant
            </Button>
            <span className="text-sc-faint">or</span>
            <SearchableSelect
              value={pickedTenantId}
              onChange={setPickedTenantId}
              ariaLabel="Select a tenant to modify"
              className="w-56 rounded-md border border-sc-border bg-sc-surface px-2 py-1.5 text-sm text-sc-text hover:bg-sc-active"
              options={[{ value: "", label: "Select a tenant…" }, ...tenants.map((t) => ({ value: t.id, label: t.name }))]}
            />
            <Button onClick={() => void modify()} disabled={!pickedTenantId}>
              <Pencil size={15} /> Modify
            </Button>
          </div>

          {error ? <p className="text-xs text-critical">{error}</p> : null}

          <TenantsImport instanceId={selectedId} />
        </>
      )}

      {modalOpen ? (
        <TenantModal
          instanceId={selectedId}
          tenant={editingTenant}
          onClose={() => setModalOpen(false)}
          onSaved={loadTenants}
        />
      ) : null}
    </section>
  );
}
