"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { sensorCategories } from "@/lib/sensor-health";
import { cn } from "@/lib/utils";
import type { SensorHealth, SensorStatus } from "@/lib/types";

const DOT: Record<SensorHealth, string> = {
  healthy: "bg-[var(--severity-success)]",
  trouble: "bg-critical",
  unknown: "bg-sc-faint",
};

const TEXT: Record<SensorHealth, string> = {
  healthy: "text-[var(--severity-success)]",
  trouble: "text-critical",
  unknown: "text-sc-faint",
};

/** The "Sensor status" block shown at the bottom of a tile: green = healthy, red = trouble. */
export function SensorStatusBlock({
  sensors,
  loading,
  action,
}: {
  sensors?: SensorStatus;
  loading?: boolean;
  action?: ReactNode;
}) {
  return (
    <section className="border-t border-sc-border-soft pt-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-sc-faint">
          Sensor status
        </h4>
        <div className="flex items-center gap-2">
          {sensors?.status === "ok" ? (
            <span className="text-[11px] text-sc-faint">
              {sensors.total} sensor{sensors.total === 1 ? "" : "s"}
            </span>
          ) : null}
          {action}
        </div>
      </div>

      {loading && !sensors ? (
        <p className="flex items-center gap-2 text-[11px] text-sc-faint">
          <Loader2 size={12} className="animate-spin" /> Loading sensors…
        </p>
      ) : !sensors || sensors.status === "error" ? (
        <p className="text-[11px] text-sc-faint">
          {sensors?.error ?? "Sensor status unavailable."}
        </p>
      ) : sensors.total === 0 ? (
        <p className="text-[11px] text-sc-faint">No sensors configured.</p>
      ) : (
        <ul className="space-y-1.5">
          {sensorCategories(sensors).map((category) => (
            <li key={category.key} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden
                className={cn("size-2 shrink-0 rounded-full", DOT[category.health])}
              />
              <span className="w-[74px] shrink-0 text-sc-muted">{category.label}</span>
              <span className={cn("shrink-0 font-medium tabular-nums", TEXT[category.health])}>
                {category.headline}
              </span>
              <span className="ml-auto truncate text-right text-[10px] text-sc-faint">
                {category.breakdown
                  .filter((bucket) => bucket.count > 0)
                  .map((bucket) => `${bucket.label} ${bucket.count}`)
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
