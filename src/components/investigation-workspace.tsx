"use client";

import { Microscope } from "lucide-react";
import type { InstanceSummary } from "@/lib/types";

/**
 * Investigation Workspace — a place to pivot across cases, alerts and assets while investigating.
 * Scaffold only; the workspace is built out in follow-up commits on this feature branch.
 */
export function InvestigationWorkspace({ instances }: { instances: InstanceSummary[]; isAdmin: boolean }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Microscope size={18} className="text-sc-accent" />
        <h2 className="text-lg font-semibold text-sc-text">Investigation Workspace</h2>
        <span className="text-xs text-sc-faint">{instances.length} servers available</span>
      </div>

      <p className="rounded-lg border border-dashed border-sc-border bg-sc-surface/50 px-4 py-16 text-center text-sm text-sc-faint">
        The Investigation Workspace is coming soon.
      </p>
    </section>
  );
}
