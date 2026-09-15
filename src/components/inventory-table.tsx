"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { cellText, type Row } from "@/lib/table-export";
import { cellTone, TONE_TEXT, type ColumnSection } from "@/lib/inventory-columns";

interface InventoryTableProps {
  loading: boolean;
  error: string | null;
  emptyLabel: string;
  sections: ColumnSection[];
  columns: string[];
  rows: Row[];
}

/** The scrollable, section-headered, colour-accented records table. */
export function InventoryTable({
  loading,
  error,
  emptyLabel,
  sections,
  columns,
  rows,
}: InventoryTableProps) {
  return (
    <div className="mt-2 max-h-[62vh] overflow-auto rounded-lg border border-sc-border-soft">
      {loading ? (
        <p className="flex items-center gap-2 px-3 py-6 text-xs text-sc-faint">
          <Loader2 size={14} className="animate-spin" /> Loading inventory…
        </p>
      ) : error ? (
        <p className="px-3 py-6 text-xs text-critical">{error}</p>
      ) : rows.length === 0 ? (
        <p className="px-3 py-6 text-xs text-sc-faint">{emptyLabel}</p>
      ) : (
        <table className="w-full border-collapse text-[11px]">
          <thead className="sticky top-0 z-10">
            <tr>
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
              {columns.map((column) => (
                <th
                  key={column}
                  className="whitespace-nowrap border-b border-sc-border-soft px-2 py-1.5 text-left font-medium text-sc-muted"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="odd:bg-sc-surface/40">
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
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
