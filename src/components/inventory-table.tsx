"use client";

import { Fragment, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { cellText, type Row } from "@/lib/table-export";
import { cellTone, TONE_TEXT, type ColumnSection } from "@/lib/inventory-columns";
import { InventoryRowDetail } from "@/components/inventory-row-detail";

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
  /** Every field, grouped — drives the per-row expand panel. */
  allSections: ColumnSection[];
  isVisible: (column: string) => boolean;
  onToggleColumn: (column: string) => void;
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
  allSections,
  isVisible,
  onToggleColumn,
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
          <thead className="sticky top-0 z-10">
            <tr>
              <th
                rowSpan={2}
                className="w-8 border-b border-sc-border bg-sc-raised px-1"
                aria-label="Expand row"
              />
              {sections.map((section) => (
                <th
                  key={section.label}
                  colSpan={section.columns.length}
                  className="whitespace-nowrap border-b border-sc-border px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: `hsl(${section.hue})`, backgroundColor: `hsl(${section.hue} / 0.12)` }}
                >
                  {section.label}
                </th>
              ))}
            </tr>
            <tr className="bg-sc-raised">
              {columns.map((column) => {
                const active = sort?.col === column;
                return (
                  <th
                    key={column}
                    className="border-b border-sc-border-soft px-2 py-1.5 text-left align-top font-medium text-sc-muted"
                  >
                    <button
                      type="button"
                      onClick={() => onSort(column)}
                      className="flex w-full items-center gap-1 whitespace-nowrap text-left hover:text-sc-text"
                      title={`Sort by ${column}`}
                    >
                      <span className="truncate">{column}</span>
                      {active ? (
                        sort!.dir === "asc" ? (
                          <ArrowUp size={11} className="text-sc-link" />
                        ) : (
                          <ArrowDown size={11} className="text-sc-link" />
                        )
                      ) : (
                        <ChevronsUpDown size={11} className="text-sc-faint/60" />
                      )}
                    </button>
                    <input
                      value={colFilters[column] ?? ""}
                      onChange={(event) => onColFilter(column, event.target.value)}
                      placeholder="Filter…"
                      className="mt-1 w-full min-w-[70px] rounded border border-sc-border-soft bg-sc-surface px-1.5 py-0.5 text-[10px] font-normal text-sc-text placeholder:text-sc-faint/70 focus:border-sc-link focus:outline-none"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
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
                    <tr className={cn(!open && "odd:bg-sc-surface/40")}>
                      <td className="border-b border-sc-border-soft px-1 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => toggleRow(row)}
                          className="text-sc-faint hover:text-sc-text"
                          title={open ? "Collapse" : "Show all fields"}
                          aria-expanded={open}
                        >
                          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </button>
                      </td>
                      {columns.map((column) => {
                        const text = cellText(row[column]);
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
