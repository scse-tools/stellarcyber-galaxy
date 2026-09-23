"use client";

import { useState } from "react";
import { Bell, LayoutGrid, Plus, RefreshCw, Rows3, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeRangePicker } from "@/components/time-range-picker";
import { UserMenu } from "@/components/user-menu";
import { ChangelogModal } from "@/components/changelog-modal";
import { APP_VERSION } from "@/lib/version";
import { SEVERITY_META } from "@/lib/severity";
import { cn } from "@/lib/utils";
import { describeRange, type TimeRangeSelection } from "@/lib/time-range";
import {
  SEVERITIES,
  type HealthTotals,
  type LayoutMode,
  type SeverityCounts,
  type ViewMode,
} from "@/lib/types";
import type { SessionUser } from "@/lib/auth/types";

interface GalaxyHeaderProps {
  totals: SeverityCounts;
  instanceCount: number;
  onlineCount: number;
  refreshing: boolean;
  range: TimeRangeSelection;
  viewMode: ViewMode;
  layout: LayoutMode;
  healthTotals: HealthTotals;
  user: SessionUser;
  notificationCount: number;
  notificationsOpen: boolean;
  onToggleNotifications: () => void;
  onRangeChange: (range: TimeRangeSelection) => void;
  onLayoutChange: (layout: LayoutMode) => void;
  onRefresh: () => void;
  onAdd: () => void;
  onOpenSettings: () => void;
}

export function GalaxyHeader({
  totals,
  instanceCount,
  onlineCount,
  refreshing,
  range,
  viewMode,
  layout,
  healthTotals,
  user,
  notificationCount,
  notificationsOpen,
  onToggleNotifications,
  onRangeChange,
  onLayoutChange,
  onRefresh,
  onAdd,
  onOpenSettings,
}: GalaxyHeaderProps) {
  const [changelogOpen, setChangelogOpen] = useState(false);
  const total = SEVERITIES.reduce((sum, severity) => sum + totals[severity], 0);
  const isAdmin = user.role === "admin";

  return (
    <header className="mb-8 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/stellar-logo-dark.svg"
              alt="Stellar Cyber"
              className="h-8 w-auto"
              width={159}
              height={22}
            />
            <h1 className="text-3xl font-semibold tracking-tight text-sc-accent">Galaxy</h1>
            <button
              type="button"
              onClick={() => setChangelogOpen(true)}
              title="Release notes"
              className="self-end rounded font-mono text-[11px] text-sc-faint transition-colors hover:text-sc-link focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sc-link"
            >
              v{APP_VERSION}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-sc-faint">
            {instanceCount} instance{instanceCount === 1 ? "" : "s"} · {onlineCount} reachable ·{" "}
            {viewMode === "health"
              ? `${healthTotals.sensorsDisconnected} sensor${healthTotals.sensorsDisconnected === 1 ? "" : "s"} down · ${healthTotals.connectorsIssues} connector issue${healthTotals.connectorsIssues === 1 ? "" : "s"}`
              : `${total.toLocaleString()} open case${total === 1 ? "" : "s"} in window`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Layout"
            className="flex items-center gap-1 rounded-lg border border-sc-border bg-sc-surface/70 p-1"
          >
            {(
              [
                { id: "grid", label: "Grid view", Icon: LayoutGrid },
                { id: "table", label: "Table view", Icon: Rows3 },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onLayoutChange(id)}
                aria-pressed={layout === id}
                title={label}
                className={cn(
                  "inline-flex items-center rounded-md p-1.5 transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sc-link",
                  layout === id
                    ? "bg-sc-primary text-white"
                    : "text-sc-muted hover:bg-sc-active hover:text-sc-text",
                )}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
          <Button onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "animate-spin" : undefined} />
            Refresh
          </Button>
          <Button
            onClick={onToggleNotifications}
            aria-label="Toggle notifications"
            aria-pressed={notificationsOpen}
            title="Notifications"
            className={cn("relative", notificationsOpen && "border-sc-link text-sc-text")}
          >
            <Bell size={15} />
            {notificationCount > 0 ? (
              <span
                aria-hidden
                className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[9px] font-semibold leading-none text-white"
              >
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            ) : null}
          </Button>
          {isAdmin ? (
            <>
              <Button variant="primary" onClick={onAdd}>
                <Plus size={15} />
                Add instance
              </Button>
              <Button onClick={onOpenSettings} aria-label="Global settings" title="Global settings">
                <Settings2 size={15} />
              </Button>
            </>
          ) : null}
          <div className="ml-1 border-l border-sc-border-soft pl-3">
            <UserMenu user={user} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-sc-border-soft bg-sc-surface/50 px-4 py-3">
        {viewMode === "health" ? (
          <p className="text-[11px] text-sc-faint">
            Live sensor &amp; connector health across all instances.
          </p>
        ) : (
          <div className="space-y-1.5">
            <TimeRangePicker value={range} disabled={refreshing} onChange={onRangeChange} />
            <p className="pl-1 text-[11px] text-sc-faint">Cases created · {describeRange(range)}</p>
          </div>
        )}

        {viewMode === "health" ? (
          <dl className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
            <HealthStat label="Sensors" value={healthTotals.sensorsTotal} />
            <HealthStat
              label="Disconnected"
              value={healthTotals.sensorsDisconnected}
              tone={healthTotals.sensorsDisconnected > 0 ? "bad" : "good"}
            />
            <HealthStat
              label="No output"
              value={healthTotals.sensorsNoOutput}
              tone={healthTotals.sensorsNoOutput > 0 ? "warn" : "good"}
            />
            <HealthStat label="Connectors active" value={healthTotals.connectorsActive} />
            <HealthStat
              label="Connector issues"
              value={healthTotals.connectorsIssues}
              tone={healthTotals.connectorsIssues > 0 ? "bad" : "good"}
            />
          </dl>
        ) : (
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
        )}
      </div>

      <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </header>
  );
}

function HealthStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const color =
    tone === "bad"
      ? "text-critical"
      : tone === "warn"
        ? "text-high"
        : tone === "good"
          ? "text-[var(--severity-success)]"
          : "text-sc-text";
  return (
    <div className="text-right">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-sc-faint">{label}</dt>
      <dd className={cn("mt-0.5 font-mono text-xl tabular-nums", color)}>{value.toLocaleString()}</dd>
    </div>
  );
}
