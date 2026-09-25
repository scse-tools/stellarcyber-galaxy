"use client";

import { Building2, Cable } from "lucide-react";
import { cn } from "@/lib/utils";

export type StudioMode = "connectors" | "tenants";

const MODES: { id: StudioMode; label: string; Icon: typeof Cable }[] = [
  { id: "connectors", label: "Connectors", Icon: Cable },
  { id: "tenants", label: "Tenants", Icon: Building2 },
];

/** Mode selector at the top of the Onboarding Studio. */
export function StudioModeTabs({ mode, onMode }: { mode: StudioMode; onMode: (mode: StudioMode) => void }) {
  return (
    <div
      role="group"
      aria-label="Onboarding mode"
      className="flex items-center gap-1 rounded-lg border border-sc-border bg-sc-surface/70 p-1"
    >
      {MODES.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onMode(id)}
          aria-pressed={mode === id}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sc-link",
            mode === id ? "bg-sc-primary text-white" : "text-sc-muted hover:bg-sc-active hover:text-sc-text",
          )}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}
