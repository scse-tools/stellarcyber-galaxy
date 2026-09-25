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
    loadTenants();
  }, [loadTenants]);

  const modify = async (custId: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/instances/${selectedId}/tenants/${encodeURIComponent(custId)}`);
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
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-sc-faint">
              {tenants.length} tenant{tenants.length === 1 ? "" : "s"}
            </span>
            <Button variant="primary" onClick={() => { setEditingTenant(null); setModalOpen(true); }}>
              <Plus size={15} /> Create tenant
            </Button>
          </div>

          {error ? <p className="text-xs text-critical">{error}</p> : null}

          <div className="max-h-[42vh] overflow-auto rounded-lg border border-sc-border-soft">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-sc-raised">
                  <th className="border-b border-sc-border bg-sc-raised px-3 py-2 text-left font-medium uppercase tracking-wide text-[10px] text-sc-faint">
                    Tenant name
                  </th>
                  <th className="border-b border-sc-border bg-sc-raised px-3 py-2 text-left font-medium uppercase tracking-wide text-[10px] text-sc-faint">
                    Cust ID
                  </th>
                  <th className="w-16 border-b border-sc-border bg-sc-raised px-3 py-2 text-right font-medium uppercase tracking-wide text-[10px] text-sc-faint">
                    Edit
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-xs text-sc-faint">
                      No tenants on this server.
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-sc-border-soft odd:bg-sc-surface/40">
                      <td className="px-3 py-1.5 font-medium text-sc-text">{tenant.name}</td>
                      <td className="px-3 py-1.5 font-mono text-sc-faint">{tenant.id}</td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => void modify(tenant.id)}
                          title={`Edit ${tenant.name}`}
                          className="rounded p-1 text-sc-faint hover:bg-sc-active hover:text-sc-link"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
