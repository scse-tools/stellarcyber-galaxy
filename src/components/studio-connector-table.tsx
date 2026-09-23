"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { cellTone, displayCell, TONE_TEXT } from "@/lib/inventory-columns";
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
  { key: "version", label: "Version" },
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

export function StudioConnectorTable({
  rows,
  loading,
  error,
  selected,
  onSelect,
  onRowClick,
}: StudioConnectorTableProps) {
  const span = STUDIO_COLUMNS.length + 1;
  return (
    <div className="max-h-[68vh] overflow-auto rounded-lg border border-sc-border-soft">
      <table className="w-full border-collapse text-[11px]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-sc-raised">
            <th className="w-8 border-b border-sc-border bg-sc-raised px-2 py-2" aria-label="Select" />
            {STUDIO_COLUMNS.map((column) => (
              <th
                key={column.key}
                className="whitespace-nowrap border-b border-sc-border bg-sc-raised px-2 py-2 text-left font-medium uppercase tracking-wide text-[10px] text-sc-faint"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={span} className="px-3 py-6 text-xs text-sc-faint">
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Loading connectors…
                </span>
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={span} className="px-3 py-6 text-xs text-critical">
                {error}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={span} className="px-3 py-6 text-xs text-sc-faint">
                No connectors on this server.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
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
