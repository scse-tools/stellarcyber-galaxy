"use client";

import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { cellText, type Row } from "@/lib/table-export";
import { cellTone, TONE_TEXT, type ColumnSection } from "@/lib/inventory-columns";

interface InventoryRowDetailProps {
  row: Row;
  sections: ColumnSection[];
  isVisible: (column: string) => boolean;
  onToggleColumn: (column: string) => void;
}

/** Every field of a single record, grouped by section, each with a show/hide-column toggle. */
export function InventoryRowDetail({ row, sections, isVisible, onToggleColumn }: InventoryRowDetailProps) {
  return (
    <div className="space-y-3 bg-sc-surface/60 px-4 py-3">
      {sections.map((section) => (
        <div key={section.label}>
          <p
            className="mb-1 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: `hsl(${section.hue})` }}
          >
            {section.label}
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-4 gap-y-1">
            {section.columns.map((column) => {
              const text = cellText(row[column]);
              const tone = cellTone(column, row[column], row);
              const shown = isVisible(column);
              return (
                <div key={column} className="flex items-start gap-1.5 py-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => onToggleColumn(column)}
                    title={shown ? "Hide this column" : "Show this column"}
                    className={cn(
                      "mt-0.5 shrink-0 transition-colors",
                      shown ? "text-sc-link hover:text-sc-text" : "text-sc-faint hover:text-sc-text",
                    )}
                  >
                    {shown ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <span className="shrink-0 text-sc-faint">{column}</span>
                  <span
                    title={text}
                    className={cn(
                      "ml-auto max-w-[60%] truncate text-right",
                      tone ? `${TONE_TEXT[tone]} font-medium` : "text-sc-text",
                    )}
                  >
                    {text || "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
