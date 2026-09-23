"use client";

import { useEffect, useMemo, useState } from "react";
import { Cable, Loader2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ConnectorDetailModal } from "@/components/connector-detail-modal";
import { cn } from "@/lib/utils";
import { cellTone, compareByColumn, displayCell, TONE_TEXT } from "@/lib/inventory-columns";
import type { Row } from "@/lib/table-export";
import type { InstanceSummary } from "@/lib/types";

/** Columns shown in the studio table, in order. */
const COLUMNS: { key: string; label: string }[] = [
  { key: "type", label: "Type" },
  { key: "tenant_name", label: "Tenant" },
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "status_code", label: "Status" },
  { key: "active", label: "Active" },
  { key: "is_collect", label: "Collecting" },
  { key: "is_respond", label: "Responding" },
  { key: "version", label: "Version" },
  { key: "last_activity", label: "Last activity" },
];
/** Sort order: by type, then tenant, then name. */
const SORT_KEYS = ["type", "tenant_name", "name"];

export function ConnectorStudio({ instances }: { instances: InstanceSummary[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);

  const options = useMemo(
    () =>
      [...instances]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .map((instance) => ({ value: instance.id, label: instance.name })),
    [instances],
  );

  useEffect(() => {
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
        const sorted = [...connectors].sort((a, b) => {
          for (const key of SORT_KEYS) {
            const cmp = compareByColumn(key, a[key], b[key]);
            if (cmp) return cmp;
          }
          return 0;
        });
        setRows(sorted);
        setError(body.connectorError ?? null);
      })
      .catch((thrown) => setError(thrown instanceof Error ? thrown.message : "Load failed."))
      .finally(() => setLoading(false));
  }, [selectedId]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cable size={18} className="text-sc-accent" />
          <h2 className="text-lg font-semibold text-sc-text">Connector Studio</h2>
          {selectedId && !loading ? (
            <span className="text-xs text-sc-faint">
              {rows.length} connector{rows.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <SearchableSelect
          value={selectedId}
          onChange={setSelectedId}
          ariaLabel="Select a server"
          title="Reuses the saved server and API key"
          className="w-64 rounded-md border border-sc-border bg-sc-surface px-2 py-1.5 text-sm text-sc-text hover:bg-sc-active"
          options={[{ value: "", label: "Select a server…" }, ...options]}
        />
      </div>

      {!selectedId ? (
        <p className="rounded-lg border border-dashed border-sc-border bg-sc-surface/50 px-4 py-12 text-center text-sm text-sc-faint">
          Choose a server to list its connectors.
        </p>
      ) : (
        <div className="max-h-[74vh] overflow-auto rounded-lg border border-sc-border-soft">
          {loading ? (
            <p className="flex items-center gap-2 px-3 py-6 text-xs text-sc-faint">
              <Loader2 size={14} className="animate-spin" /> Loading connectors…
            </p>
          ) : error ? (
            <p className="px-3 py-6 text-xs text-critical">{error}</p>
          ) : rows.length === 0 ? (
            <p className="px-3 py-6 text-xs text-sc-faint">No connectors on this server.</p>
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-sc-raised">
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className="whitespace-nowrap border-b border-sc-border bg-sc-raised px-2 py-2 text-left font-medium uppercase tracking-wide text-[10px] text-sc-faint"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={index}
                    onClick={() => setDetail(row)}
                    className="cursor-pointer border-b border-sc-border-soft odd:bg-sc-surface/40 hover:bg-sc-active"
                  >
                    {COLUMNS.map((column) => {
                      const text = displayCell(column.key, row[column.key]);
                      const tone = cellTone(column.key, row[column.key], row);
                      return (
                        <td
                          key={column.key}
                          title={text}
                          className={cn(
                            "max-w-[240px] truncate px-2 py-1.5",
                            tone ? `${TONE_TEXT[tone]} font-medium` : "text-sc-text",
                          )}
                        >
                          {text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <ConnectorDetailModal connector={detail} onClose={() => setDetail(null)} />
    </section>
  );
}
