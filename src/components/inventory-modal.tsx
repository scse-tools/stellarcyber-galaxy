"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { cellText, downloadCsv, printTable, toCsv, type Row } from "@/lib/table-export";
import { compareCells, DEFAULT_VISIBLE, matchesStatus, sectionize } from "@/lib/inventory-columns";
import type { ColumnSection, StatusFilter } from "@/lib/inventory-columns";
import { InventoryTable, type SortState } from "@/components/inventory-table";
import { InventoryToolbar, type InventoryTab } from "@/components/inventory-toolbar";
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
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [sort, setSort] = useState<SortState>(null);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

  useEffect(() => setTab(initialTab), [initialTab, instance?.id]);
  useEffect(() => setStatus(initialStatus ?? null), [initialStatus, initialTab, instance?.id]);
  useEffect(() => {
    // Reset column controls whenever the dataset changes.
    setVisibility({});
    setSort(null);
    setColFilters({});
  }, [tab, instance?.id]);

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

  const isVisible = useCallback(
    (column: string) => visibility[column] ?? DEFAULT_VISIBLE[tab].includes(column),
    [visibility, tab],
  );

  const sections = useMemo(() => visibleSectionsOf(allSections, isVisible), [allSections, isVisible]);
  const columns = useMemo(() => sections.flatMap((section) => section.columns), [sections]);
  const allColumnCount = useMemo(
    () => allSections.reduce((sum, section) => sum + section.columns.length, 0),
    [allSections],
  );

  const rows = useMemo(() => {
    let filtered = status ? allRows.filter((r) => matchesStatus(tab, status.key, r)) : allRows;
    for (const [column, term] of Object.entries(colFilters)) {
      const needle = term.trim().toLowerCase();
      if (needle) filtered = filtered.filter((r) => cellText(r[column]).toLowerCase().includes(needle));
    }
    const sortKey = sort?.col ?? groupField;
    const dir = sort?.dir ?? "asc";
    const secondKey = tab === "sensors" ? "hostname" : "name";
    return [...filtered].sort((a, b) => {
      const primary = compareCells(cellText(a[sortKey]), cellText(b[sortKey]));
      const ordered = dir === "asc" ? primary : -primary;
      return ordered || compareCells(cellText(a[secondKey]), cellText(b[secondKey]));
    });
  }, [allRows, status, colFilters, sort, groupField, tab]);

  const toggleColumn = useCallback(
    (column: string) => setVisibility((prev) => ({ ...prev, [column]: !(prev[column] ?? DEFAULT_VISIBLE[tab].includes(column)) })),
    [tab],
  );
  const resetColumns = useCallback(() => setVisibility({}), []);
  const cycleSort = useCallback(
    (column: string) =>
      setSort((prev) =>
        prev?.col !== column
          ? { col: column, dir: "asc" }
          : prev.dir === "asc"
            ? { col: column, dir: "desc" }
            : null,
      ),
    [],
  );
  const setColFilter = useCallback(
    (column: string, value: string) => setColFilters((prev) => ({ ...prev, [column]: value })),
    [],
  );

  const suffix = status?.label ?? "";
  const baseName = `${instance?.name ?? "instance"}-${tab}${suffix ? `-${suffix}` : ""}`.replace(/\s+/g, "_");
  const title = `${instance?.name ?? ""} — ${tab}${suffix ? ` (${suffix})` : ""}`;

  const exportCsv = useCallback(() => downloadCsv(`${baseName}.csv`, toCsv(columns, rows)), [baseName, columns, rows]);
  const exportPdf = useCallback(() => printTable(title, columns, rows), [title, columns, rows]);

  if (!instance) return null;

  return (
    <Modal
      open
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
      />
    </Modal>
  );
}
