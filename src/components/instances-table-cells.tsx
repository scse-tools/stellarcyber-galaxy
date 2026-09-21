"use client";

import { SEVERITY_META } from "@/lib/severity";
import { cn } from "@/lib/utils";
import { SEVERITIES, type ConnectorStatus, type InstanceStats, type SensorStatus } from "@/lib/types";

export function Th({
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

function Num({ value, className, color }: { value: number | null; className?: string; color?: string }) {
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

export function CaseCells({ stats }: { stats?: InstanceStats }) {
  const ok = stats?.status === "ok";
  return (
    <>
      <Num value={ok ? stats!.total : null} className="text-sc-text font-semibold" />
      {SEVERITIES.map((severity) => (
        <Num key={severity} value={ok ? stats!.counts[severity] : null} color={SEVERITY_META[severity].token} />
      ))}
    </>
  );
}

export function HealthCells({ sensors, connectors }: { sensors?: SensorStatus; connectors?: ConnectorStatus }) {
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
