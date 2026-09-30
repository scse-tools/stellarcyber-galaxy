"use client";

import { useEffect, useRef, useState } from "react";
import { GripVertical, RotateCcw, SlidersHorizontal } from "lucide-react";
import { columnLabel } from "@/lib/investigation-columns";
import { cn } from "@/lib/utils";

interface Props {
  order: string[];
  isVisible: (column: string) => boolean;
  onToggle: (column: string) => void;
  onMove: (from: number, to: number) => void;
  onReset: () => void;
}

/** Popover to show/hide, reorder (drag), and reset the alert table's columns. */
export function InvestigationColumnMenu({ order, isVisible, onToggle, onMove, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const visibleCount = order.filter(isVisible).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md border border-sc-border bg-sc-surface/70 px-2.5 py-1.5 text-xs text-sc-muted transition-colors hover:bg-sc-active hover:text-sc-text"
      >
        <SlidersHorizontal size={13} />
        Columns
        <span className="tabular-nums text-sc-faint">
          {visibleCount}/{order.length}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-sc-border bg-sc-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-sc-border-soft px-3 py-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-sc-faint">Columns</span>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-[11px] text-sc-link hover:underline"
            >
              <RotateCcw size={11} />
              Reset
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {order.map((column, index) => (
              <li
                key={column}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) onMove(dragIndex, index);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 text-xs",
                  dragIndex === index && "opacity-50",
                )}
              >
                <GripVertical size={13} className="shrink-0 cursor-grab text-sc-faint" />
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isVisible(column)}
                    onChange={() => onToggle(column)}
                    className="shrink-0 accent-sc-primary"
                  />
                  <span className="truncate text-sc-text" title={column}>
                    {columnLabel(column)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
