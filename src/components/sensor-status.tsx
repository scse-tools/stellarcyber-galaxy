"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { SensorStatus } from "@/lib/types";

const FEATURE_LABEL: Record<string, string> = { wds: "WDS", ds: "DS", modular: "Modular" };
const featureLabel = (f: string) => FEATURE_LABEL[f] ?? f.toUpperCase();

/** Cleaned-up sensor summary: connected vs disconnected up top, feature mix below. */
export function SensorStatusBlock({
  sensors,
  loading,
  action,
}: {
  sensors?: SensorStatus;
  loading?: boolean;
  action?: ReactNode;
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
          <div className="flex items-stretch gap-2">
            <Stat label="Connected" value={sensors.connection.connected} tone="good" />
            <Stat label="Disconnected" value={down} tone={down > 0 ? "bad" : "good"} />
            {sensors.upgrade.need > 0 ? (
              <Stat label="Upgrade" value={sensors.upgrade.need} tone="warn" />
            ) : null}
          </div>
          <p className="truncate text-[11px] text-sc-muted">
            <span className="text-sc-faint">Features:</span>{" "}
            {features.map(([feature, count]) => `${featureLabel(feature)} ${count}`).join(" · ")}
          </p>
        </div>
      )}
    </section>
  );
}

type Tone = "good" | "bad" | "warn";
const TONE: Record<Tone, { dot: string; value: string }> = {
  good: { dot: "bg-[var(--severity-success)]", value: "text-sc-text" },
  bad: { dot: "bg-critical", value: "text-critical" },
  warn: { dot: "bg-high", value: "text-high" },
};

function Stat({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-sc-border-soft bg-sc-raised/40 px-2.5 py-1.5">
      <div className="flex items-center gap-1.5">
        <span aria-hidden className={`size-2 rounded-full ${TONE[tone].dot}`} />
        <span className={`font-mono text-base tabular-nums ${TONE[tone].value}`}>
          {value.toLocaleString()}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[10px] uppercase tracking-wide text-sc-faint">{label}</p>
    </div>
  );
}

function Pending() {
  return (
    <p className="flex items-center gap-2 text-[11px] text-sc-faint">
      <Loader2 size={12} className="animate-spin" /> Loading sensors…
    </p>
  );
}
