"use client";

import { useEffect, useRef } from "react";
import { Settings, Table2 } from "lucide-react";
import { SEVERITY_META } from "@/lib/severity";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn, hostOf } from "@/lib/utils";
import { SEVERITIES } from "@/lib/types";
import type {
  ConnectorStatus,
  InstanceStats,
  InstanceSummary,
  SensorStatus,
  Tenant,
  ViewMode,
} from "@/lib/types";
import type { InventoryTab } from "@/components/inventory-modal";
import type { StatusFilter } from "@/lib/inventory-columns";

interface InstancesTableProps {
  instances: InstanceSummary[];
  stats: Record<string, InstanceStats>;
  sensors: Record<string, SensorStatus>;
  connectors: Record<string, ConnectorStatus>;
  tenants: Record<string, Tenant[]>;
  selectedTenant: Record<string, string | null>;
  viewMode: ViewMode;
  highlightedInstanceId: string | null;
  isAdmin: boolean;
  onOpenSettings: (instance: InstanceSummary) => void;
  onOpenInventory: (instance: InstanceSummary, tab: InventoryTab, status?: StatusFilter) => void;
  onSelectTenant: (instanceId: string, tenantId: string | null) => void;
}

const CASE_COLS = ["Open", "Critical", "High", "Medium", "Low"];
const SEV_COLOR: Record<string, string> = Object.fromEntries(
  SEVERITIES.map((severity) => [SEVERITY_META[severity].label, SEVERITY_META[severity].token]),
);
const HEALTH_COLS = ["Sensors", "Connected", "Disconnected", "No output", "Active", "Healthy", "Issues"];

export function InstancesTable(props: InstancesTableProps) {
  const { instances, viewMode, highlightedInstanceId } = props;
  const metricCols = viewMode === "cases" ? CASE_COLS : HEALTH_COLS;
  const highlightRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (highlightedInstanceId) highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedInstanceId]);

  return (
    <div className="overflow-x-auto rounded-lg border border-sc-border-soft">
      <table className="w-full border-collapse text-xs">
        <thead className="bg-sc-raised">
          <tr>
            <Th className="text-left">Instance</Th>
            <Th className="text-left">Tenant</Th>
            {metricCols.map((c) => (
              <Th
                key={c}
                className="text-right"
                style={viewMode === "cases" && SEV_COLOR[c] ? { color: SEV_COLOR[c] } : undefined}
              >
                {c}
              </Th>
            ))}
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {instances.map((instance) => (
            <tr
              key={instance.id}
              ref={instance.id === highlightedInstanceId ? highlightRef : undefined}
              className={cn(
                "border-b border-sc-border-soft transition-colors odd:bg-sc-surface/40 hover:bg-sc-active/40",
                instance.id === highlightedInstanceId && "bg-sc-accent/10",
              )}
            >
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => window.open(instance.consoleUrl, "_blank", "noopener,noreferrer")}
                  className="text-left"
                  title={`Open ${instance.name} console`}
                >
                  <span className="font-medium text-sc-text">{instance.name}</span>
                  <span className="block text-[10px] text-sc-faint">{hostOf(instance.consoleUrl)}</span>
                </button>
              </td>
              <td className="px-3 py-2">
                <TenantCell {...props} instance={instance} />
              </td>
              {viewMode === "cases" ? (
                <CaseCells stats={props.stats[instance.id]} />
              ) : (
                <HealthCells sensors={props.sensors[instance.id]} connectors={props.connectors[instance.id]} />
              )}
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => props.onOpenInventory(instance, "sensors")}
                    title="Open inventory table"
                    className="rounded p-1 text-sc-faint hover:bg-sc-active hover:text-sc-text"
                  >
                    <Table2 size={14} />
                  </button>
                  {props.isAdmin ? (
                    <button
                      type="button"
                      onClick={() => props.onOpenSettings(instance)}
                      title="Instance settings"
                      className="rounded p-1 text-sc-faint hover:bg-sc-active hover:text-sc-text"
                    >
                      <Settings size={14} />
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={style}
      className={cn(
        "whitespace-nowrap border-b border-sc-border px-3 py-2 font-medium uppercase tracking-wide text-[10px] text-sc-faint",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Num({
  value,
  className,
  color,
}: {
  value: number | null;
  className?: string;
  color?: string;
}) {
  return (
    <td
      style={color && value !== null ? { color } : undefined}
      className={cn(
        "px-3 py-2 text-right font-mono tabular-nums",
        className ?? (color ? "text-sc-faint" : "text-sc-text"),
      )}
    >
      {value === null ? "—" : value.toLocaleString()}
    </td>
  );
}

function CaseCells({ stats }: { stats?: InstanceStats }) {
  const ok = stats?.status === "ok";
  return (
    <>
      <Num value={ok ? stats!.total : null} className="text-sc-text font-semibold" />
      {SEVERITIES.map((severity) => (
        <Num
          key={severity}
          value={ok ? stats!.counts[severity] : null}
          color={SEVERITY_META[severity].token}
        />
      ))}
    </>
  );
}

function HealthCells({ sensors, connectors }: { sensors?: SensorStatus; connectors?: ConnectorStatus }) {
  const s = sensors?.status === "ok" ? sensors : null;
  const c = connectors?.status === "ok" ? connectors : null;
  const down = s ? s.connection.disconnected + s.connection.other : null;
  return (
    <>
      <Num value={s ? s.total : null} />
      <Num value={s ? s.connection.connected : null} className="text-[var(--severity-success)]" />
      <Num value={down} className={down && down > 0 ? "text-critical" : "text-sc-text"} />
      <Num value={s ? s.noOutput : null} className={s && s.noOutput > 0 ? "text-high" : "text-[var(--severity-success)]"} />
      <Num value={c ? c.active : null} />
      <Num value={c ? c.healthy : null} className="text-[var(--severity-success)]" />
      <Num value={c ? c.issues : null} className={c && c.issues > 0 ? "text-critical" : "text-sc-text"} />
    </>
  );
}

function TenantCell({
  instance,
  tenants,
  selectedTenant,
  onSelectTenant,
}: InstancesTableProps & { instance: InstanceSummary }) {
  const list = tenants[instance.id];
  if (instance.tenantId) {
    return (
      <span className="text-[11px] text-sc-muted" title="Locked in settings">
        🔒 {list?.find((t) => t.id === instance.tenantId)?.name ?? instance.tenantId}
      </span>
    );
  }
  if (!list || list.length === 0) return <span className="text-sc-faint">—</span>;
  return (
    <SearchableSelect
      value={selectedTenant[instance.id] ?? ""}
      onChange={(value) => onSelectTenant(instance.id, value || null)}
      ariaLabel={`${instance.name} tenant`}
      className="w-40 rounded-md border border-sc-border-soft bg-sc-surface px-1.5 py-1 text-[11px] text-sc-muted hover:text-sc-text"
      options={[
        { value: "", label: "All tenants" },
        ...list.map((tenant) => ({ value: tenant.id, label: tenant.name })),
      ]}
    />
  );
}
