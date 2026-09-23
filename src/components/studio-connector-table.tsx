"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cellTone, compareByColumn, displayCell, TONE_TEXT } from "@/lib/inventory-columns";
import type { Row } from "@/lib/table-export";

/** Columns shown in the studio connector table, in order. */
export const STUDIO_COLUMNS: { key: string; label: string }[] = [
  { key: "type", label: "Type" },
  { key: "tenant_name", label: "Tenant" },
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "status_code", label: "Status" },
  { key: "active", label: "Active" },
  { key: "is_collect", label: "Collecting" },
  { key: "last_activity", label: "Last activity" },
];

interface StudioConnectorTableProps {
  rows: Row[];
  loading: boolean;
  error: string | null;
  selected: Row | null;
  onSelect: (row: Row) => void;
  onRowClick: (row: Row) => void;
}

export function StudioConnectorTable({ rows, loading, error, selected, onSelect, onRowClick }: StudioConnectorTableProps) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const span = STUDIO_COLUMNS.length + 1;

  // Distinct values per column, offered as searchable dropdown filters.
  const columnValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const { key } of STUDIO_COLUMNS) {
      const set = new Set<string>();
      for (const row of rows) {
        const text = displayCell(key, row[key]);
        if (text) set.add(text);
      }
      map[key] = [...set].sort((a, b) => compareByColumn(key, a, b));
    }
    return map;
  }, [rows]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        STUDIO_COLUMNS.every(({ key }) => !filters[key] || displayCell(key, row[key]) === filters[key]),
      ),
    [rows, filters],
  );

  return (
    <div className="max-h-[68vh] overflow-auto rounded-lg border border-sc-border-soft">
      <table className="w-full border-collapse text-[11px]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-sc-raised">
            <th className="w-8 border-b border-sc-border bg-sc-raised px-2 py-2 align-top" aria-label="Select" />
            {STUDIO_COLUMNS.map((column) => (
              <th
                key={column.key}
                className="min-w-[8rem] border-b border-sc-border bg-sc-raised px-2 py-2 text-left align-top"
              >
                <div className="font-medium uppercase tracking-wide text-[10px] text-sc-faint">{column.label}</div>
                <SearchableSelect
                  value={filters[column.key] ?? ""}
                  onChange={(value) => setFilters((prev) => ({ ...prev, [column.key]: value }))}
                  ariaLabel={`Filter by ${column.label}`}
                  className="mt-1 w-full rounded border border-sc-border-soft bg-sc-surface px-1.5 py-0.5 text-[10px] font-normal text-sc-text hover:bg-sc-active"
                  options={[
                    { value: "", label: "All" },
                    ...(columnValues[column.key] ?? []).map((value) => ({ value, label: value })),
                  ]}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <Message span={span}>
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Loading connectors…
              </span>
            </Message>
          ) : error ? (
            <Message span={span} tone="error">
              {error}
            </Message>
          ) : rows.length === 0 ? (
            <Message span={span}>No connectors on this server.</Message>
          ) : filteredRows.length === 0 ? (
            <Message span={span}>No connectors match the filters.</Message>
          ) : (
            filteredRows.map((row, index) => (
              <tr
                key={index}
                onClick={() => onRowClick(row)}
                className={cn(
                  "cursor-pointer border-b border-sc-border-soft hover:bg-sc-active",
                  selected === row ? "bg-sc-primary/15" : "odd:bg-sc-surface/40",
                )}
              >
                <td className="px-2 py-1.5 text-center align-middle">
                  <input
                    type="radio"
                    name="studio-template-row"
                    checked={selected === row}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => onSelect(row)}
                    aria-label={`Select ${String(row.name ?? "connector")}`}
                    className="accent-sc-primary"
                  />
                </td>
                {STUDIO_COLUMNS.map((column) => {
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Message({ span, children, tone }: { span: number; children: React.ReactNode; tone?: "error" }) {
  return (
    <tr>
      <td colSpan={span} className={cn("px-3 py-6 text-xs", tone === "error" ? "text-critical" : "text-sc-faint")}>
        {children}
      </td>
    </tr>
  );
}
