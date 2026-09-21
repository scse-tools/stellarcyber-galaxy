"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, X } from "lucide-react";
import type { ColumnSection } from "@/lib/inventory-columns";
import type { SortState } from "@/components/inventory-table";

/** A DOM-id-safe datalist id for a column's distinct-value suggestions. */
const valuesListId = (column: string) => `vals-${column.replace(/[^\w-]/g, "_")}`;

interface HeadProps {
  sections: ColumnSection[];
  columns: string[];
  sort: SortState;
  onSort: (column: string) => void;
  colFilters: Record<string, string>;
  onColFilter: (column: string, value: string) => void;
  columnValues: Record<string, string[]>;
}

/** Sticky two-tier header: colour-accented section row, then per-column sort + filter/combobox. */
export function InventoryTableHead({
  sections,
  columns,
  sort,
  onSort,
  colFilters,
  onColFilter,
  columnValues,
}: HeadProps) {
  return (
    <thead className="sticky top-0 z-10">
      <tr>
        <th rowSpan={2} className="w-8 border-b border-sc-border bg-sc-raised px-1" aria-label="Expand row" />
        {sections.map((section) => (
          <th
            key={section.label}
            colSpan={section.columns.length}
            className="whitespace-nowrap border-b border-sc-border px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide"
            style={{
              color: `hsl(${section.hue})`,
              // Opaque (tint composited over the surface) so scrolled rows hide behind it.
              background: `linear-gradient(hsl(${section.hue} / 0.12), hsl(${section.hue} / 0.12)), var(--sc-surface)`,
            }}
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
              className="border-b border-sc-border-soft bg-sc-raised px-2 py-1.5 text-left align-top font-medium text-sc-muted"
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
              <div className="relative mt-1">
                <input
                  value={colFilters[column] ?? ""}
                  onChange={(event) => onColFilter(column, event.target.value)}
                  placeholder="Filter…"
                  list={valuesListId(column)}
                  className="w-full min-w-[70px] rounded border border-sc-border-soft bg-sc-surface py-0.5 pl-1.5 pr-5 text-[10px] font-normal text-sc-text placeholder:text-sc-faint/70 focus:border-sc-link focus:outline-none"
                />
                {colFilters[column] ? (
                  <button
                    type="button"
                    onClick={() => onColFilter(column, "")}
                    aria-label={`Clear ${column} filter`}
                    title="Clear filter"
                    className="absolute inset-y-0 right-0 flex items-center px-1 text-sc-faint hover:text-sc-text"
                  >
                    <X size={11} />
                  </button>
                ) : null}
                <datalist id={valuesListId(column)}>
                  {(columnValues[column] ?? []).map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </div>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
