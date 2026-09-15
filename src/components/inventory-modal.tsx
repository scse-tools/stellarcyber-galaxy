"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { cellText, downloadCsv, printTable, toCsv, type Row } from "@/lib/table-export";
import type { InstanceSummary } from "@/lib/types";

export type InventoryTab = "sensors" | "connectors";

/** The field each tab is "broken out by", surfaced as the first column and the group filter. */
const GROUP_FIELD: Record<InventoryTab, string> = { sensors: "feature", connectors: "type" };
// Identity-ish columns worth showing first, after the group field.
const LEAD: Record<InventoryTab, string[]> = {
  sensors: ["hostname", "sensor_id", "connection_status", "sw_version"],
  connectors: ["name", "category", "active", "is_collect"],
};

interface InventoryData {
  sensors: Row[];
  connectors: Row[];
  sensorError: string | null;
  connectorError: string | null;
}

interface InventoryModalProps {
  instance: InstanceSummary | null;
  initialTab: InventoryTab;
  tenantId: string | null;
  onClose: () => void;
}

export function InventoryModal({ instance, initialTab, tenantId, onClose }: InventoryModalProps) {
  const [tab, setTab] = useState<InventoryTab>(initialTab);
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<string>("");

  useEffect(() => setTab(initialTab), [initialTab, instance?.id]);
  useEffect(() => setGroup(""), [tab, instance?.id]);

  useEffect(() => {
    if (!instance) return;
    setLoading(true);
    setError(null);
    const params = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    fetch(`/api/instances/${instance.id}/inventory${params}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Could not load inventory.");
        setData(body as InventoryData);
      })
      .catch((thrown) => setError(thrown instanceof Error ? thrown.message : "Load failed."))
      .finally(() => setLoading(false));
  }, [instance, tenantId]);

  const allRows = useMemo(
    () => (tab === "sensors" ? (data?.sensors ?? []) : (data?.connectors ?? [])),
    [tab, data],
  );
  const tabError = tab === "sensors" ? data?.sensorError : data?.connectorError;
  const groupField = GROUP_FIELD[tab];

  const groupValues = useMemo(() => {
    const set = new Set<string>();
    for (const row of allRows) set.add(cellText(row[groupField]) || "—");
    return [...set].sort();
  }, [allRows, groupField]);

  const rows = useMemo(() => {
    const filtered = group ? allRows.filter((r) => (cellText(r[groupField]) || "—") === group) : allRows;
    return [...filtered].sort((a, b) =>
      (cellText(a[groupField]) || "").localeCompare(cellText(b[groupField]) || "") ||
      cellText(a[LEAD[tab][0]]).localeCompare(cellText(b[LEAD[tab][0]])),
    );
  }, [allRows, group, groupField, tab]);

  // Column order: group field, lead identity fields, then every remaining field alphabetically.
  const columns = useMemo(() => {
    const keys = new Set<string>();
    for (const row of allRows) for (const key of Object.keys(row)) keys.add(key);
    const lead = [groupField, ...LEAD[tab]].filter((k) => keys.has(k));
    const rest = [...keys].filter((k) => !lead.includes(k)).sort();
    return [...lead, ...rest];
  }, [allRows, groupField, tab]);

  const baseName = `${instance?.name ?? "instance"}-${tab}${group ? `-${group}` : ""}`.replace(/\s+/g, "_");
  const title = `${instance?.name ?? ""} — ${tab}${group ? ` (${groupField}: ${group})` : ""}`;

  const exportCsv = useCallback(() => downloadCsv(`${baseName}.csv`, toCsv(columns, rows)), [baseName, columns, rows]);
  const exportPdf = useCallback(() => printTable(title, columns, rows), [title, columns, rows]);

  if (!instance) return null;

  return (
    <Modal
      open
      title={`Inventory · ${instance.name}`}
      description="Full sensor and connector records, broken out by feature / type."
      onClose={onClose}
      className="max-w-[min(96vw,1500px)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-sc-border bg-sc-surface/70 p-1">
          {(["sensors", "connectors"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                tab === id ? "bg-sc-primary text-white" : "text-sc-muted hover:bg-sc-active hover:text-sc-text",
              )}
            >
              {id}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Select
            aria-label={`Filter by ${groupField}`}
            className="w-40 py-1.5 text-xs"
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          >
            <option value="">All {groupField}s</option>
            {groupValues.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Button onClick={exportCsv} disabled={rows.length === 0}>
            <Download size={14} /> CSV
          </Button>
          <Button onClick={exportPdf} disabled={rows.length === 0}>
            <Printer size={14} /> PDF
          </Button>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-sc-faint">
        {loading ? "" : `${rows.length} row${rows.length === 1 ? "" : "s"} · ${columns.length} fields`}
      </p>

      <div className="mt-2 max-h-[62vh] overflow-auto rounded-lg border border-sc-border-soft">
        {loading ? (
          <p className="flex items-center gap-2 px-3 py-6 text-xs text-sc-faint">
            <Loader2 size={14} className="animate-spin" /> Loading inventory…
          </p>
        ) : error || tabError ? (
          <p className="px-3 py-6 text-xs text-critical">{error ?? tabError}</p>
        ) : rows.length === 0 ? (
          <p className="px-3 py-6 text-xs text-sc-faint">No {tab}.</p>
        ) : (
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 bg-sc-raised">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="whitespace-nowrap border-b border-sc-border-soft px-2 py-1.5 text-left font-medium text-sc-muted"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="odd:bg-sc-surface/40">
                  {columns.map((column) => {
                    const text = cellText(row[column]);
                    return (
                      <td
                        key={column}
                        title={text}
                        className="max-w-[240px] truncate border-b border-sc-border-soft px-2 py-1 text-sc-text"
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
    </Modal>
  );
}
