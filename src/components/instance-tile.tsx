"use client";

import { useEffect, useRef, useState } from "react";
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
  type Tenant,
} from "@/lib/types";

interface InstanceTileProps {
  instance: InstanceSummary;
  stats?: InstanceStats;
  sensors?: SensorStatus;
  connectors?: ConnectorStatus;
  refreshing?: boolean;
  highlighted?: boolean;
  onOpenSettings?: (instance: InstanceSummary) => void;
  /** Tenants visible to this instance's API key. Omitted or empty hides the tenant picker. */
  tenants?: Tenant[];
  /** The session-only tenant override in effect; `null` means "use the instance's default". */
  selectedTenant?: string | null;
  onSelectTenant?: (tenantId: string | null) => void;
}

export function InstanceTile({
  instance,
  stats,
  sensors,
  connectors,
  refreshing,
  highlighted,
  onOpenSettings,
  tenants,
  selectedTenant,
  onSelectTenant,
}: InstanceTileProps) {
  const [expanded, setExpanded] = useState(false);
  const failed = stats?.status === "error";
  const pending = !stats || refreshing;
  const counts = stats?.counts ?? EMPTY_COUNTS;
  const muted = failed || !stats;
  const ref = useRef<HTMLElement>(null);

  // Scroll the tile into view when a toast/notification points at it.
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlighted]);

  const openConsole = () => {
    window.open(instance.consoleUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <article
      ref={ref}
      onClick={openConsole}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openConsole();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${instance.name} console`}
      title={`Open ${instance.name} in a new tab`}
      className={cn(
        "tile-rise group flex w-full cursor-pointer flex-col gap-2.5 rounded-lg border p-3",
        "border-sc-border bg-sc-surface/85 backdrop-blur transition-all duration-300",
        "hover:border-sc-border-soft",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sc-link",
        failed && "border-critical/40",
        highlighted && "border-sc-accent ring-2 ring-sc-accent ring-offset-2 ring-offset-sc-bg",
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
              onClick={(event) => {
                event.stopPropagation();
                onOpenSettings(instance);
              }}
              aria-label={`${instance.name} settings`}
              title="Instance settings"
              className="rounded p-0.5 text-sc-faint transition-colors hover:bg-sc-active hover:text-sc-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sc-link"
            >
              <Settings size={14} />
            </button>
          ) : null}
        </div>
      </header>

      {instance.tenantId ? (
        <select
          disabled
          value={instance.tenantId}
          onClick={(event) => event.stopPropagation()}
          aria-label={`${instance.name} tenant (locked)`}
          title="Locked to this tenant — change in settings"
          className="w-full cursor-not-allowed rounded-md border border-sc-border-soft bg-sc-surface px-1.5 py-1 text-[10px] font-medium text-sc-muted opacity-80"
        >
          <option value={instance.tenantId}>
            🔒 {tenants?.find((t) => t.id === instance.tenantId)?.name ?? instance.tenantId}
          </option>
        </select>
      ) : tenants && tenants.length > 0 ? (
        <select
          value={selectedTenant ?? ""}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation();
            onSelectTenant?.(event.target.value || null);
          }}
          aria-label={`${instance.name} tenant`}
          title="Scope this tile to a tenant"
          className="w-full rounded-md border border-sc-border-soft bg-sc-surface px-1.5 py-1 text-[10px] font-medium text-sc-muted transition-colors hover:bg-sc-active hover:text-sc-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sc-link"
        >
          <option value="">All tenants</option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </select>
      ) : null}

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
      />

      {failed ? (
        <p className="truncate text-[9px] text-critical/90">{stats?.error}</p>
      ) : null}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setExpanded((value) => !value);
        }}
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
