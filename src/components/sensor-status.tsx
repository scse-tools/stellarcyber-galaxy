"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { SensorMetrics, SensorStatus } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

const FEATURE_LABEL: Record<string, string> = { wds: "WDS", ds: "DS", modular: "Modular" };
const featureLabel = (f: string) => FEATURE_LABEL[f] ?? f.toUpperCase();

/** Cleaned-up sensor summary: connected vs disconnected up top, feature mix below. */
export function SensorStatusBlock({
  sensors,
  loading,
  action,
  onStatus,
  showMetrics,
}: {
  sensors?: SensorStatus;
  loading?: boolean;
  action?: ReactNode;
  onStatus?: (key: string, label: string) => void;
  showMetrics?: boolean;
}) {
  const down = sensors ? sensors.connection.disconnected + sensors.connection.other : 0;
  const features = sensors
    ? Object.entries(sensors.byFeature).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <section className="border-t border-sc-border-soft pt-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-sc-faint">
          Sensor status
        </h4>
        <div className="flex items-center gap-2">
          {sensors?.status === "ok" ? (
            <span className="text-[11px] text-sc-faint">{sensors.total} total</span>
          ) : null}
          {action}
        </div>
      </div>

      {loading && !sensors ? (
        <Pending />
      ) : !sensors || sensors.status === "error" ? (
        <p className="text-[11px] text-sc-faint">{sensors?.error ?? "Sensor status unavailable."}</p>
      ) : sensors.total === 0 ? (
        <p className="text-[11px] text-sc-faint">No sensors configured.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-stretch gap-2">
            <Stat label="Connected" value={sensors.connection.connected} tone="good" onClick={onStatus && (() => onStatus("connected", "Connected"))} />
            <Stat label="Disconnected" value={down} tone={down > 0 ? "bad" : "good"} onClick={onStatus && (() => onStatus("disconnected", "Disconnected"))} />
            <Stat label="No output" value={sensors.noOutput} tone={sensors.noOutput > 0 ? "warn" : "good"} onClick={onStatus && (() => onStatus("nooutput", "No output"))} />
            {sensors.upgrade.need > 0 ? (
              <Stat label="Upgrade" value={sensors.upgrade.need} tone="warn" onClick={onStatus && (() => onStatus("upgrade", "Upgrade"))} />
            ) : null}
          </div>
          <p className="truncate text-[11px] text-sc-muted">
            <span className="text-sc-faint">Features:</span>{" "}
            {features.map(([feature, count]) => `${featureLabel(feature)} ${count}`).join(" · ")}
          </p>
          {showMetrics ? <SensorMetricsRow metrics={sensors.metrics} /> : null}
        </div>
      )}
    </section>
  );
}

const usageTone = (pct: number) =>
  pct >= 90 ? "bg-critical" : pct >= 75 ? "bg-high" : "bg-[var(--severity-success)]";

/** CPU / disk usage bars (0–100) plus total in/out throughput, shown in health mode. */
function SensorMetricsRow({ metrics }: { metrics: SensorMetrics }) {
  return (
    <div className="space-y-1.5 border-t border-sc-border-soft pt-2">
      <UsageBar label="CPU" avg={metrics.cpuAvg} max={metrics.cpuMax} />
      <UsageBar label="Disk" avg={metrics.diskAvg} max={metrics.diskMax} />
      <div className="flex gap-2 pt-0.5">
        <Throughput label="In" bytes={metrics.inBytes} />
        <Throughput label="Out" bytes={metrics.outBytes} />
      </div>
    </div>
  );
}

function UsageBar({ label, avg, max }: { label: string; avg: number; max: number }) {
  return (
    <div className="flex items-center gap-2" title={`avg ${avg}% · peak ${max}%`}>
      <span className="w-8 shrink-0 text-[10px] uppercase tracking-wide text-sc-faint">{label}</span>
      <div className="h-1.5 grow overflow-hidden rounded-full bg-sc-raised">
        <div className={`h-full rounded-full ${usageTone(avg)}`} style={{ width: `${avg}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-sc-text">
        {avg}%
      </span>
    </div>
  );
}

function Throughput({ label, bytes }: { label: string; bytes: number }) {
  return (
    <div className="min-w-0 grow basis-1/2 overflow-hidden rounded-md border border-sc-border-soft bg-sc-raised/40 px-2.5 py-1.5">
      <p className="truncate font-mono text-[13px] tabular-nums text-sc-text">{formatBytes(bytes)}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-sc-faint">{label}</p>
    </div>
  );
}

type Tone = "good" | "bad" | "warn";
const TONE: Record<Tone, { dot: string; value: string }> = {
  good: { dot: "bg-[var(--severity-success)]", value: "text-sc-text" },
  bad: { dot: "bg-critical", value: "text-critical" },
  warn: { dot: "bg-high", value: "text-high" },
};

function Stat({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  tone: Tone;
  onClick?: (() => void) | false;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        <span aria-hidden className={`size-2 rounded-full ${TONE[tone].dot}`} />
        <span className={`font-mono text-base tabular-nums ${TONE[tone].value}`}>
          {value.toLocaleString()}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[10px] uppercase tracking-wide text-sc-faint">{label}</p>
    </>
  );
  const base =
    "min-w-0 grow basis-[calc(50%-0.25rem)] overflow-hidden rounded-md border border-sc-border-soft bg-sc-raised/40 px-2.5 py-1.5 text-left";
  if (!onClick) return <div className={base}>{inner}</div>;
  return (
    <button
      type="button"
      title={`Show ${label} in the table`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`${base} transition-colors hover:border-sc-link hover:bg-sc-active`}
    >
      {inner}
    </button>
  );
}

function Pending() {
  return (
    <p className="flex items-center gap-2 text-[11px] text-sc-faint">
      <Loader2 size={12} className="animate-spin" /> Loading sensors…
    </p>
  );
}
