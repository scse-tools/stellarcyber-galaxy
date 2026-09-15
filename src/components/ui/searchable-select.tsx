"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  title?: string;
}

/**
 * A select with a search box in its dropdown. The panel is portalled to the body and positioned
 * with `fixed` coordinates, so it never gets clipped by a tile, table, or modal's overflow.
 */
export function SearchableSelect({
  value,
  options,
  onChange,
  disabled,
  className,
  ariaLabel,
  title,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value);

  const reposition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
    setPos({ top: rect.bottom + 4, left, width });
  };

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const focusTimer = setTimeout(() => searchRef.current?.focus(), 0);
    const onMove = () => reposition();
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((option) => option.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={title}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={cn(
          "inline-flex items-center justify-between gap-1 disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        <span className="truncate">{selected ? selected.label : ""}</span>
        <ChevronDown size={12} className="shrink-0 opacity-70" />
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
              onClick={(event) => event.stopPropagation()}
              className="z-[70] overflow-hidden rounded-md border border-sc-border bg-sc-surface shadow-xl shadow-black/40"
            >
              <div className="flex items-center gap-1.5 border-b border-sc-border-soft px-2 py-1.5">
                <Search size={12} className="shrink-0 text-sc-faint" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search…"
                  className="w-full bg-transparent text-xs text-sc-text placeholder:text-sc-faint focus:outline-none"
                />
              </div>
              <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-sc-faint">No matches</li>
                ) : (
                  filtered.map((option) => (
                    <li key={option.value}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-sc-active",
                          option.value === value ? "text-sc-text" : "text-sc-muted",
                        )}
                      >
                        <span className="truncate">{option.label}</span>
                        {option.value === value ? (
                          <Check size={12} className="shrink-0 text-sc-link" />
                        ) : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
