"use client";

import { useState } from "react";
import { AlertTriangle, ArrowUpRight, ChevronDown, Loader2, Settings } from "lucide-react";
import { SeverityRows } from "@/components/severity-bar";
import { SensorStatusBlock } from "@/components/sensor-status";
import { ConnectorStatusBlock } from "@/components/connector-status";
import { cn, consoleLink, hostOf } from "@/lib/utils";
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
  const [expanded, setExpanded] = useState(false);
  const failed = stats?.status === "error";
  const pending = !stats || refreshing;
  const counts = stats?.counts ?? EMPTY_COUNTS;
  const muted = failed || !stats;

  return (
    <article
      className={cn(
        "tile-rise group flex h-full w-full flex-col gap-2.5 rounded-lg border p-3",
        "border-sc-border bg-sc-surface/85 backdrop-blur transition-colors duration-200",
        "hover:border-sc-border-soft",
        failed && "border-critical/40",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-sc-text">{instance.name}</h3>
          <p className="truncate text-[10px] text-sc-faint">{hostOf(instance.consoleUrl)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusDot failed={failed} pending={Boolean(pending)} />
          {onOpenSettings ? (
            <button
              type="button"
              onClick={() => onOpenSettings(instance)}
              aria-label={`${instance.name} settings`}
              title="Instance settings"
              className="rounded p-0.5 text-sc-faint transition-colors hover:bg-sc-active hover:text-sc-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sc-link"
            >
              <Settings size={14} />
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div
            className={cn(
              "font-mono text-[1.75rem] leading-none tabular-nums",
              muted ? "text-sc-faint" : "text-sc-text",
            )}
          >
            {muted ? "—" : (stats?.total ?? 0).toLocaleString()}
          </div>
          <p className="mt-1 text-[9px] font-medium uppercase tracking-wider text-sc-faint">
            Open cases
          </p>
        </div>
        <TileLink href={consoleLink(instance.consoleUrl, "/cases")} label="Cases" />
      </div>

      <SeverityRows
        counts={counts}
        statuses={stats?.statuses}
        statusCounts={stats?.statusCounts}
        muted={muted}
        compact
        showLegend={expanded}
      />

      {failed ? (
        <p className="truncate text-[9px] text-critical/90">{stats?.error}</p>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="mt-auto flex items-center justify-between rounded-md border border-sc-border-soft px-2 py-1 text-[10px] font-medium text-sc-muted transition-colors hover:bg-sc-active hover:text-sc-text"
      >
        <span>Sensors &amp; connectors</span>
        <ChevronDown
          size={13}
          className={cn("transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded ? (
        <div>
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
                href={consoleLink(instance.consoleUrl, "/system/integrations/connectors")}
                label="Connectors"
              />
            }
          />
        </div>
      ) : null}
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
      onClick={(event) => event.stopPropagation()}
      className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium text-sc-link transition-colors hover:bg-sc-active hover:text-sc-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sc-link"
    >
      {label}
      <ArrowUpRight size={11} />
    </a>
  );
}

function StatusDot({ failed, pending }: { failed: boolean; pending: boolean }) {
  if (pending) return <Loader2 aria-hidden className="size-3.5 animate-spin text-sc-faint" />;
  if (failed) return <AlertTriangle aria-hidden className="size-3.5 text-critical" />;
  return (
    <span aria-hidden className="relative flex size-2">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--severity-success)] opacity-40" />
      <span className="relative inline-flex size-2 rounded-full bg-[var(--severity-success)]" />
    </span>
  );
}
