"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { downloadCsv, printTable, toCsv, type Row } from "@/lib/table-export";
import { compareByColumn, displayCell, matchesStatus, sectionize } from "@/lib/inventory-columns";
import type { ColumnSection, StatusFilter } from "@/lib/inventory-columns";
import { InventoryTable } from "@/components/inventory-table";
import { InventoryToolbar, type InventoryTab } from "@/components/inventory-toolbar";
import { SensorDetailModal } from "@/components/sensor-detail-modal";
import { ConnectorDetailModal } from "@/components/connector-detail-modal";
import { useColumnControls } from "@/lib/use-column-controls";
import type { InstanceSummary } from "@/lib/types";

export type { InventoryTab };

/** The field each tab is "broken out by", surfaced first and used as the default sort key. */
const GROUP_FIELD: Record<InventoryTab, string> = { sensors: "feature", connectors: "type" };
interface InventoryData {
  sensors: Row[];
  connectors: Row[];
  sensorError: string | null;
  connectorError: string | null;
}

interface InventoryModalProps {
  instance: InstanceSummary | null;
  initialTab: InventoryTab;
  initialStatus?: StatusFilter | null;
  tenantId: string | null;
  onClose: () => void;
}

/** Keeps only the sections/columns the picker currently shows, preserving section order. */
function visibleSectionsOf(sections: ColumnSection[], isVisible: (c: string) => boolean): ColumnSection[] {
  return sections
    .map((s) => ({ ...s, columns: s.columns.filter(isVisible) }))
    .filter((s) => s.columns.length > 0);
}

export function InventoryModal({
  instance,
  initialTab,
  initialStatus,
  tenantId,
  onClose,
}: InventoryModalProps) {
  const [tab, setTab] = useState<InventoryTab>(initialTab);
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter | null>(initialStatus ?? null);
  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const { isVisible, toggleColumn, resetColumns, sort, cycleSort, colFilters, setColFilter } =
    useColumnControls(tab, instance?.id);

  useEffect(() => setTab(initialTab), [initialTab, instance?.id]);
  useEffect(() => setStatus(initialStatus ?? null), [initialStatus, initialTab, instance?.id]);
  useEffect(() => setDetailRow(null), [tab, instance?.id]);

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

  // Every column, grouped into labelled, colour-accented sections (drives the column picker).
  const allSections = useMemo(() => {
    const keys = new Set<string>();
    for (const row of allRows) for (const key of Object.keys(row)) keys.add(key);
    return sectionize([...keys], groupField);
  }, [allRows, groupField]);

  const sections = useMemo(() => visibleSectionsOf(allSections, isVisible), [allSections, isVisible]);
  const columns = useMemo(() => sections.flatMap((section) => section.columns), [sections]);
  const allColumnCount = useMemo(
    () => allSections.reduce((sum, section) => sum + section.columns.length, 0),
    [allSections],
  );

  // Distinct values per visible column, offered as pickable filter suggestions.
  const columnValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const column of columns) {
      const set = new Set<string>();
      for (const row of allRows) {
        const text = displayCell(column, row[column]);
        if (text) set.add(text);
      }
      map[column] = [...set].sort((a, b) => compareByColumn(column, a, b)).slice(0, 500);
    }
    return map;
  }, [columns, allRows]);

  const rows = useMemo(() => {
    let filtered = status ? allRows.filter((r) => matchesStatus(tab, status.key, r)) : allRows;
    for (const [column, term] of Object.entries(colFilters)) {
      const needle = term.trim().toLowerCase();
      if (!needle) continue;
      // A term that exactly matches a distinct value (e.g. picked from the dropdown) filters by
      // equality — otherwise "connected" would also match "disconnected" as a substring. Free
      // partial text still matches as a substring.
      const isExact = (columnValues[column] ?? []).some((v) => v.toLowerCase() === needle);
      filtered = filtered.filter((r) => {
        const cell = displayCell(column, r[column]).toLowerCase();
        return isExact ? cell === needle : cell.includes(needle);
      });
    }
    const sortKey = sort?.col ?? groupField;
    const dir = sort?.dir ?? "asc";
    const secondKey = tab === "sensors" ? "hostname" : "name";
    return [...filtered].sort((a, b) => {
      const primary = compareByColumn(sortKey, a[sortKey], b[sortKey]);
      const ordered = dir === "asc" ? primary : -primary;
      return ordered || compareByColumn(secondKey, a[secondKey], b[secondKey]);
    });
  }, [allRows, status, colFilters, sort, groupField, tab, columnValues]);

  const suffix = status?.label ?? "";
  const baseName = `${instance?.name ?? "instance"}-${tab}${suffix ? `-${suffix}` : ""}`.replace(/\s+/g, "_");
  const title = `${instance?.name ?? ""} — ${tab}${suffix ? ` (${suffix})` : ""}`;

  const exportCsv = useCallback(() => downloadCsv(`${baseName}.csv`, toCsv(columns, rows)), [baseName, columns, rows]);
  const exportPdf = useCallback(() => printTable(title, columns, rows), [title, columns, rows]);

  if (!instance) return null;

  return (
    <Modal
      open
      variant="overlay"
      title={`Inventory · ${instance.name}`}
      description="Full sensor and connector records. Pick columns, then sort or filter any of them."
      onClose={onClose}
      className="max-w-[min(96vw,1500px)]"
    >
      <InventoryToolbar
        tab={tab}
        onTab={(id) => {
          setTab(id);
          setStatus(null);
        }}
        status={status}
        onClearStatus={() => setStatus(null)}
        sections={allSections}
        isVisible={isVisible}
        onToggleColumn={toggleColumn}
        onResetColumns={resetColumns}
        visibleCount={columns.length}
        totalCount={allColumnCount}
        onExportCsv={exportCsv}
        onExportPdf={exportPdf}
        exportDisabled={rows.length === 0}
      />

      <p className="mt-2 text-[11px] text-sc-faint">
        {loading ? "" : `${rows.length} row${rows.length === 1 ? "" : "s"} · ${columns.length} of ${allColumnCount} fields`}
      </p>

      <InventoryTable
        loading={loading}
        error={error ?? tabError ?? null}
        emptyLabel={`No ${tab}.`}
        sections={sections}
        columns={columns}
        rows={rows}
        sort={sort}
        onSort={cycleSort}
        colFilters={colFilters}
        onColFilter={setColFilter}
        columnValues={columnValues}
        allSections={allSections}
        isVisible={isVisible}
        onToggleColumn={toggleColumn}
        onRowClick={setDetailRow}
      />
      {tab === "sensors" ? (
        <SensorDetailModal sensor={detailRow} onClose={() => setDetailRow(null)} />
      ) : (
        <ConnectorDetailModal connector={detailRow} onClose={() => setDetailRow(null)} />
      )}
    </Modal>
  );
}
