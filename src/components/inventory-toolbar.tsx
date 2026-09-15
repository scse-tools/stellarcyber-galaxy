"use client";

import { Download, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ColumnPicker } from "@/components/column-picker";
import type { ColumnSection, StatusFilter } from "@/lib/inventory-columns";

export type InventoryTab = "sensors" | "connectors";

interface InventoryToolbarProps {
  tab: InventoryTab;
  onTab: (tab: InventoryTab) => void;
  status: StatusFilter | null;
  onClearStatus: () => void;
  sections: ColumnSection[];
  isVisible: (column: string) => boolean;
  onToggleColumn: (column: string) => void;
  onResetColumns: () => void;
  visibleCount: number;
  totalCount: number;
  onExportCsv: () => void;
  onExportPdf: () => void;
  exportDisabled: boolean;
}

/** Tabs, status chip, column picker and export buttons for the inventory modal. */
export function InventoryToolbar({
  tab,
  onTab,
  status,
  onClearStatus,
  sections,
  isVisible,
  onToggleColumn,
  onResetColumns,
  visibleCount,
  totalCount,
  onExportCsv,
  onExportPdf,
  exportDisabled,
}: InventoryToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-1 rounded-lg border border-sc-border bg-sc-surface/70 p-1">
        {(["sensors", "connectors"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
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
        {status ? (
          <button
            type="button"
            onClick={onClearStatus}
            className="inline-flex items-center gap-1 rounded-md border border-sc-link/40 bg-sc-link/10 px-2 py-1 text-[11px] font-medium text-sc-link hover:bg-sc-link/20"
            title="Clear status filter"
          >
            {status.label}
            <X size={12} />
          </button>
        ) : null}
        <ColumnPicker
          sections={sections}
          isVisible={isVisible}
          onToggle={onToggleColumn}
          onReset={onResetColumns}
          visibleCount={visibleCount}
          totalCount={totalCount}
        />
        <Button onClick={onExportCsv} disabled={exportDisabled}>
          <Download size={14} /> CSV
        </Button>
        <Button onClick={onExportPdf} disabled={exportDisabled}>
          <Printer size={14} /> PDF
        </Button>
      </div>
    </div>
  );
}
