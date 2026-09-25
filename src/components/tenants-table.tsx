"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { compareByColumn, displayCell } from "@/lib/inventory-columns";
import type { Row } from "@/lib/table-export";

interface TenantsTableProps {
  rows: Row[];
  columns: string[];
  /** When provided, an Edit action column is shown per row. */
  onEdit?: (row: Row) => void;
}

/** Tenants table with per-column searchable filters and a per-row Edit action. */
export function TenantsTable({ rows, columns, onEdit }: TenantsTableProps) {
  const [filters, setFilters] = useState<Record<string, string>>({});

  const columnValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const key of columns) {
      const set = new Set<string>();
      for (const row of rows) {
        const text = displayCell(key, row[key]);
        if (text) set.add(text);
      }
      map[key] = [...set].sort((a, b) => compareByColumn(key, a, b));
    }
    return map;
  }, [rows, columns]);

  const filtered = useMemo(
    () => rows.filter((row) => columns.every((key) => !filters[key] || displayCell(key, row[key]) === filters[key])),
    [rows, columns, filters],
  );

  const span = columns.length + (onEdit ? 1 : 0);

  return (
    <div className="max-h-[52vh] overflow-auto rounded-lg border border-sc-border-soft">
      <table className="w-full border-collapse text-[11px]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-sc-raised">
            {columns.map((column) => (
              <th
                key={column}
                className="min-w-[9rem] border-b border-sc-border bg-sc-raised px-2 py-2 text-left align-top"
              >
                <div className="font-medium uppercase tracking-wide text-[10px] text-sc-faint">{column}</div>
                <SearchableSelect
                  value={filters[column] ?? ""}
                  onChange={(value) => setFilters((prev) => ({ ...prev, [column]: value }))}
                  ariaLabel={`Filter by ${column}`}
                  className="mt-1 w-full rounded border border-sc-border-soft bg-sc-surface px-1.5 py-0.5 text-[10px] font-normal text-sc-text hover:bg-sc-active"
                  options={[
                    { value: "", label: "All" },
                    ...(columnValues[column] ?? []).map((value) => ({ value, label: value })),
                  ]}
                />
              </th>
            ))}
            {onEdit ? (
              <th className="w-14 border-b border-sc-border bg-sc-raised px-2 py-2 text-right align-top font-medium uppercase tracking-wide text-[10px] text-sc-faint">
                Edit
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {columns.length === 0 ? (
            <tr>
              <td colSpan={span} className="px-3 py-6 text-center text-xs text-sc-faint">
                No columns selected.
              </td>
            </tr>
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan={span} className="px-3 py-6 text-center text-xs text-sc-faint">
                No tenants match the filters.
              </td>
            </tr>
          ) : (
            filtered.map((row, index) => (
              <tr key={index} className="border-b border-sc-border-soft odd:bg-sc-surface/40 hover:bg-sc-active/40">
                {columns.map((column) => {
                  const text = displayCell(column, row[column]);
                  return (
                    <td key={column} title={text} className={cn("max-w-[240px] truncate px-2 py-1.5 text-sc-text")}>
                      {text}
                    </td>
                  );
                })}
                {onEdit ? (
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      title="Edit tenant"
                      className="rounded p-1 text-sc-faint hover:bg-sc-active hover:text-sc-link"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
