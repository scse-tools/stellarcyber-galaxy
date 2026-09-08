"use client";

import { AlertTriangle, ArrowUpRight, Loader2, Settings } from "lucide-react";
import { SeverityRows } from "@/components/severity-bar";
import { SensorStatusBlock } from "@/components/sensor-status";
import { ConnectorStatusBlock } from "@/components/connector-status";
import { cn, consoleLink, formatRelativeTime, hostOf } from "@/lib/utils";
import {
  EMPTY_COUNTS,
  type ConnectorStatus,
  type InstanceStats,
  type InstanceSummary,
  type SensorStatus,
} from "@/lib/types";

interface InstanceTileProps {
  instance: InstanceSummary;
  stats?: InstanceStats;
  sensors?: SensorStatus;
  connectors?: ConnectorStatus;
  refreshing?: boolean;
  onOpenSettings?: (instance: InstanceSummary) => void;
}

export function InstanceTile({
  instance,
  stats,
  sensors,
  connectors,
  refreshing,
  onOpenSettings,
}: InstanceTileProps) {
  const failed = stats?.status === "error";
  const pending = !stats || refreshing;
  const counts = stats?.counts ?? EMPTY_COUNTS;
  const muted = failed || !stats;

  return (
    <article
      className={cn(
        "tile-rise group flex h-full min-h-[520px] w-full flex-col gap-4 rounded-xl border p-5",
        "border-sc-border bg-sc-surface/85 backdrop-blur transition-colors duration-200",
        "hover:border-sc-border-soft",
        failed && "border-critical/40",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-sc-text">{instance.name}</h3>
          <p className="truncate text-xs text-sc-faint">{hostOf(instance.consoleUrl)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <StatusDot failed={failed} pending={Boolean(pending)} />
          {onOpenSettings ? (
            <button
              type="button"
              onClick={() => onOpenSettings(instance)}
              aria-label={`${instance.name} settings`}
              title="Instance settings"
              className={cn(
                "rounded-md p-1 text-sc-faint transition-colors",
                "hover:bg-sc-active hover:text-sc-text",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sc-link",
              )}
            >
              <Settings size={16} />
            </button>
          ) : null}
        </div>
      </header>

      <div>
        <div className="flex items-end justify-between gap-2">
          <div
            className={cn(
              "font-mono text-[2.75rem] leading-none tabular-nums",
              muted ? "text-sc-faint" : "text-sc-text",
            )}
          >
            {muted ? "—" : (stats?.total ?? 0).toLocaleString()}
          </div>
          <TileLink href={consoleLink(instance.consoleUrl, "/cases")} label="Cases" />
        </div>
        <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-sc-faint">
          Open cases
        </p>
      </div>

      <SeverityRows
        counts={counts}
        statuses={stats?.statuses}
        statusCounts={stats?.statusCounts}
        muted={muted}
      />

      <p className="truncate text-[10px] text-sc-faint">
        {failed ? (
          <span className="text-critical/90">{stats?.error}</span>
        ) : (
          <>
            {stats?.toolUsed ? `via ${stats.toolUsed}` : "awaiting MCP"}
            {stats ? ` · ${(stats.latencyMs / 1000).toFixed(1)}s` : ""} ·{" "}
            {formatRelativeTime(stats?.fetchedAt)}
          </>
        )}
      </p>

      <div className="mt-auto space-y-0">
        <SensorStatusBlock
          sensors={sensors}
          loading={refreshing}
          action={
            <TileLink
              href={consoleLink(instance.consoleUrl, "/system/collect/sensors")}
              label="Sensors"
            />
          }
        />
        <ConnectorStatusBlock
          connectors={connectors}
          loading={refreshing}
          action={
            <TileLink
              href={consoleLink(instance.consoleUrl, "/connectors")}
              label="Connectors"
            />
          }
        />
      </div>
    </article>
  );
}

/** A small "↗" deep link into the console. Opens in a new tab. */
function TileLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        "text-sc-link transition-colors hover:bg-sc-active hover:text-sc-text",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sc-link",
      )}
    >
      {label}
      <ArrowUpRight size={12} />
    </a>
  );
}

function StatusDot({ failed, pending }: { failed: boolean; pending: boolean }) {
  if (pending) return <Loader2 aria-hidden className="size-4 animate-spin text-sc-faint" />;
  if (failed) return <AlertTriangle aria-hidden className="size-4 text-critical" />;
  return (
    <span aria-hidden className="relative flex size-2.5">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--severity-success)] opacity-40" />
      <span className="relative inline-flex size-2.5 rounded-full bg-[var(--severity-success)]" />
    </span>
  );
}
