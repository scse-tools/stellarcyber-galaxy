"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColumnSection } from "@/lib/inventory-columns";

interface ColumnPickerProps {
  sections: ColumnSection[];
  isVisible: (column: string) => boolean;
  onToggle: (column: string) => void;
  onReset: () => void;
  visibleCount: number;
  totalCount: number;
}

/** A "Columns" button whose popover lists every field (grouped by section) with a show/hide checkbox. */
export function ColumnPicker({
  sections,
  isVisible,
  onToggle,
  onReset,
  visibleCount,
  totalCount,
}: ColumnPickerProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const reposition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 240;
    setPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) });
  };

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => reposition();
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-sc-border bg-sc-raised px-3 py-2 text-sm font-medium text-sc-text transition-colors hover:border-sc-link"
      >
        <Columns3 size={14} /> Columns
        <span className="text-[11px] text-sc-faint">
          {visibleCount}/{totalCount}
        </span>
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              style={{ position: "fixed", top: pos.top, left: pos.left, width: 240 }}
              className="z-[70] max-h-[60vh] overflow-y-auto rounded-md border border-sc-border bg-sc-surface shadow-xl shadow-black/40"
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-sc-border-soft bg-sc-surface px-3 py-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-sc-faint">
                  Columns
                </span>
                <button
                  type="button"
                  onClick={onReset}
                  className="text-[11px] font-medium text-sc-link hover:underline"
                >
                  Reset
                </button>
              </div>
              {sections.map((section) => (
                <div key={section.label} className="px-2 py-1.5">
                  <p
                    className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: `hsl(${section.hue})` }}
                  >
                    {section.label}
                  </p>
                  {section.columns.map((column) => (
                    <label
                      key={column}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs text-sc-muted hover:bg-sc-active"
                    >
                      <input
                        type="checkbox"
                        checked={isVisible(column)}
                        onChange={() => onToggle(column)}
                        className="accent-sc-primary"
                      />
                      <span className={cn("truncate", isVisible(column) && "text-sc-text")}>
                        {column}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
