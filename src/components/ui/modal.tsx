"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /**
   * "modal" (default) dims and blurs the page and locks scroll. "overlay" is a lighter floating
   * window: no blur, no scroll lock, and it disappears the moment you click away or press Escape.
   */
  variant?: "modal" | "overlay";
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  className,
  variant = "modal",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const overlay = variant === "overlay";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    // A blocking modal locks page scroll; a floating overlay leaves the page as-is.
    const previousOverflow = document.body.style.overflow;
    if (!overlay) document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (!overlay) document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, overlay]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-center p-4",
        // Overlay opens tall and pinned near the top; a blocking modal stays centered.
        overlay ? "items-start bg-black/20" : "items-center bg-black/60 backdrop-blur-sm",
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={!overlay}
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "w-full max-w-lg rounded-xl border border-sc-border",
          "bg-sc-surface shadow-2xl shadow-black/50 outline-none",
          overlay ? "flex h-full flex-col overflow-hidden" : "max-h-[88vh] overflow-y-auto",
          className,
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-sc-border-soft px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-sc-text">{title}</h2>
            {description ? <p className="mt-1 text-xs text-sc-faint">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-sc-faint transition-colors hover:bg-sc-active hover:text-sc-text"
          >
            <X size={16} />
          </button>
        </header>
        <div className={cn(overlay ? "flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4" : "px-5 py-4")}>
          {children}
        </div>
      </div>
    </div>
  );
}
