"use client";

import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeRangePicker } from "@/components/time-range-picker";
import { SEVERITY_META } from "@/lib/severity";
import { describeRange, type TimeRangeSelection } from "@/lib/time-range";
import { SEVERITIES, type SeverityCounts } from "@/lib/types";

interface GalaxyHeaderProps {
  totals: SeverityCounts;
  instanceCount: number;
  onlineCount: number;
  refreshing: boolean;
  range: TimeRangeSelection;
  onRangeChange: (range: TimeRangeSelection) => void;
  onRefresh: () => void;
  onAdd: () => void;
}

export function GalaxyHeader({
  totals,
  instanceCount,
  onlineCount,
  refreshing,
  range,
  onRangeChange,
  onRefresh,
  onAdd,
}: GalaxyHeaderProps) {
  const total = SEVERITIES.reduce((sum, severity) => sum + totals[severity], 0);

  return (
    <header className="mb-8 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-sc-text">
            Stellar Cyber <span className="text-sc-accent">Galaxy</span>
          </h1>
          <p className="mt-1.5 text-xs text-sc-faint">
            {instanceCount} instance{instanceCount === 1 ? "" : "s"} · {onlineCount} reachable ·{" "}
            {total.toLocaleString()} open case{total === 1 ? "" : "s"} in window
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "animate-spin" : undefined} />
            Refresh
          </Button>
          <Button variant="primary" onClick={onAdd}>
            <Plus size={15} />
            Add instance
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-sc-border-soft bg-sc-surface/50 px-4 py-3">
        <div className="space-y-1.5">
          <TimeRangePicker value={range} disabled={refreshing} onChange={onRangeChange} />
          <p className="pl-1 text-[11px] text-sc-faint">
            Cases created · {describeRange(range)}
          </p>
        </div>

        <dl className="flex items-center gap-5">
          {SEVERITIES.map((severity) => (
            <div key={severity} className="text-right">
              <dt className="flex items-center justify-end gap-1.5 text-[10px] font-medium uppercase tracking-wide text-sc-faint">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: SEVERITY_META[severity].token }}
                />
                {SEVERITY_META[severity].label}
              </dt>
              <dd className="mt-0.5 font-mono text-xl tabular-nums text-sc-text">
                {totals[severity].toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
