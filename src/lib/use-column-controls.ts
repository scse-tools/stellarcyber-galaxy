"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_VISIBLE } from "@/lib/inventory-columns";
import { loadColumnVisibility, saveColumnVisibility } from "@/lib/inventory-prefs";
import type { SortState } from "@/components/inventory-table";
import type { InventoryTab } from "@/components/inventory-toolbar";

/**
 * Column show/hide, sort and per-column filter state for the inventory table. Visibility is
 * persisted per tab across sessions; sort and filters are transient and reset when the tab or
 * instance changes.
 */
export function useColumnControls(tab: InventoryTab, instanceId: string | undefined) {
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() =>
    loadColumnVisibility(tab),
  );
  const [sort, setSort] = useState<SortState>(null);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    setVisibility(loadColumnVisibility(tab));
    setSort(null);
    setColFilters({});
  }, [tab, instanceId]);

  const isVisible = useCallback(
    (column: string) => visibility[column] ?? DEFAULT_VISIBLE[tab].includes(column),
    [visibility, tab],
  );
  const toggleColumn = useCallback(
    (column: string) =>
      setVisibility((prev) => {
        const next = { ...prev, [column]: !(prev[column] ?? DEFAULT_VISIBLE[tab].includes(column)) };
        saveColumnVisibility(tab, next);
        return next;
      }),
    [tab],
  );
  const resetColumns = useCallback(() => {
    setVisibility({});
    saveColumnVisibility(tab, {});
  }, [tab]);
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

  return { isVisible, toggleColumn, resetColumns, sort, cycleSort, colFilters, setColFilter };
}
