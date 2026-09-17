"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Row } from "@/lib/table-export";
import { cellTone, displayCell, TONE_TEXT, type ColumnSection } from "@/lib/inventory-columns";
import { InventoryRowDetail } from "@/components/inventory-row-detail";
import { InventoryTableHead } from "@/components/inventory-table-head";

export type SortState = { col: string; dir: "asc" | "desc" } | null;

interface InventoryTableProps {
  loading: boolean;
  error: string | null;
  emptyLabel: string;
  sections: ColumnSection[];
  columns: string[];
  rows: Row[];
  sort: SortState;
  onSort: (column: string) => void;
  colFilters: Record<string, string>;
  onColFilter: (column: string, value: string) => void;
  /** Distinct values per column, offered as pickable suggestions beside each filter box. */
  columnValues: Record<string, string[]>;
  /** Every field, grouped — drives the per-row expand panel. */
  allSections: ColumnSection[];
  isVisible: (column: string) => boolean;
  onToggleColumn: (column: string) => void;
  /** When set, clicking a row (outside the expander) invokes this — used for the sensor detail modal. */
  onRowClick?: (row: Row) => void;
}

/** The scrollable, section-headered records table with per-column sort/filter and row expanders. */
export function InventoryTable({
  loading,
  error,
  emptyLabel,
  sections,
  columns,
  rows,
  sort,
  onSort,
  colFilters,
  onColFilter,
  columnValues,
  allSections,
  isVisible,
  onToggleColumn,
  onRowClick,
}: InventoryTableProps) {
  const [expanded, setExpanded] = useState<Set<Row>>(new Set());
  const toggleRow = (row: Row) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });

  const span = columns.length + 1;

  return (
    <div className="mt-2 max-h-[62vh] overflow-auto rounded-lg border border-sc-border-soft">
      {loading ? (
        <p className="flex items-center gap-2 px-3 py-6 text-xs text-sc-faint">
          <Loader2 size={14} className="animate-spin" /> Loading inventory…
        </p>
      ) : error ? (
        <p className="px-3 py-6 text-xs text-critical">{error}</p>
      ) : (
        <table className="w-full border-collapse text-[11px]">
          <InventoryTableHead
            sections={sections}
            columns={columns}
            sort={sort}
            onSort={onSort}
            colFilters={colFilters}
            onColFilter={onColFilter}
            columnValues={columnValues}
          />
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={span} className="px-3 py-6 text-center text-xs text-sc-faint">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const open = expanded.has(row);
                return (
                  <Fragment key={index}>
                    <tr
                      className={cn(
                        !open && "odd:bg-sc-surface/40",
                        onRowClick && "cursor-pointer hover:bg-sc-active",
                      )}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      <td className="border-b border-sc-border-soft px-1 text-center align-middle">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleRow(row);
                          }}
                          className="text-sc-faint hover:text-sc-text"
                          title={open ? "Collapse" : "Show all fields"}
                          aria-expanded={open}
                        >
                          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </button>
                      </td>
                      {columns.map((column) => {
                        const text = displayCell(column, row[column]);
                        const tone = cellTone(column, row[column], row);
                        return (
                          <td
                            key={column}
                            title={text}
                            className={cn(
                              "max-w-[240px] truncate border-b border-sc-border-soft px-2 py-1",
                              tone ? `${TONE_TEXT[tone]} font-medium` : "text-sc-text",
                            )}
                          >
                            {text}
                          </td>
                        );
                      })}
                    </tr>
                    {open ? (
                      <tr>
                        <td colSpan={span} className="border-b border-sc-border">
                          <InventoryRowDetail
                            row={row}
                            sections={allSections}
                            isVisible={isVisible}
                            onToggleColumn={onToggleColumn}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
