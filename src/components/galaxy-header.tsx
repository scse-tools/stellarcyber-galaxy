"use client";

import { useState } from "react";
import { Bell, Plus, RefreshCw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeRangePicker } from "@/components/time-range-picker";
import { UserMenu } from "@/components/user-menu";
import { ChangelogModal } from "@/components/changelog-modal";
import { APP_VERSION } from "@/lib/version";
import { SEVERITY_META } from "@/lib/severity";
import { cn } from "@/lib/utils";
import { describeRange, type TimeRangeSelection } from "@/lib/time-range";
import { SEVERITIES, type SeverityCounts } from "@/lib/types";
import type { SessionUser } from "@/lib/auth/types";

interface GalaxyHeaderProps {
  totals: SeverityCounts;
  instanceCount: number;
  onlineCount: number;
  refreshing: boolean;
  range: TimeRangeSelection;
  user: SessionUser;
  notificationCount: number;
  notificationsOpen: boolean;
  onToggleNotifications: () => void;
  onRangeChange: (range: TimeRangeSelection) => void;
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
  user,
  notificationCount,
  notificationsOpen,
  onToggleNotifications,
  onRangeChange,
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
          <div className="flex items-baseline gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-sc-text">
              Stellar Cyber <span className="text-sc-accent">Galaxy</span>
            </h1>
            <button
              type="button"
              onClick={() => setChangelogOpen(true)}
              title="Release notes"
              className="rounded font-mono text-[11px] text-sc-faint transition-colors hover:text-sc-link focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sc-link"
            >
              v{APP_VERSION}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-sc-faint">
            {instanceCount} instance{instanceCount === 1 ? "" : "s"} · {onlineCount} reachable ·{" "}
            {total.toLocaleString()} open case{total === 1 ? "" : "s"} in window
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="space-y-1.5">
          <TimeRangePicker value={range} disabled={refreshing} onChange={onRangeChange} />
          <p className="pl-1 text-[11px] text-sc-faint">Cases created · {describeRange(range)}</p>
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

      <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </header>
  );
}
