"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { ConnectorStatus } from "@/lib/types";

/** Collecting-connector health: totals, categories, active, and healthy vs issue counts. */
export function ConnectorStatusBlock({
  connectors,
  loading,
  action,
}: {
  connectors?: ConnectorStatus;
  loading?: boolean;
  action?: ReactNode;
}) {
  return (
    <section className="border-t border-sc-border-soft pt-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-sc-faint">
          Connector status
        </h4>
        <div className="flex items-center gap-2">
          {connectors?.status === "ok" ? (
            <span className="text-[11px] text-sc-faint">{connectors.total} collecting</span>
          ) : null}
          {action}
        </div>
      </div>

      {loading && !connectors ? (
        <p className="flex items-center gap-2 text-[11px] text-sc-faint">
          <Loader2 size={12} className="animate-spin" /> Loading connectors…
        </p>
      ) : !connectors || connectors.status === "error" ? (
        <p className="text-[11px] text-sc-faint">
          {connectors?.error ?? "Connector status unavailable."}
        </p>
      ) : connectors.total === 0 ? (
        <p className="text-[11px] text-sc-faint">No collecting connectors.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Categories" value={connectors.categories} />
          <Metric label="Active" value={connectors.active} sub={`of ${connectors.total}`} />
          <Metric label="Healthy" value={connectors.healthy} tone="good" />
          <Metric label="Issues" value={connectors.issues} tone={connectors.issues > 0 ? "bad" : "good"} />
        </div>
      )}
    </section>
  );
}

type Tone = "neutral" | "good" | "bad";
const VALUE_TONE: Record<Tone, string> = {
  neutral: "text-sc-text",
  good: "text-[var(--severity-success)]",
  bad: "text-critical",
};

function Metric({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: Tone;
}) {
  return (
    <div className="flex items-baseline justify-between rounded-md border border-sc-border-soft bg-sc-raised/40 px-2.5 py-1.5">
      <span className="text-[10px] uppercase tracking-wide text-sc-faint">{label}</span>
      <span className={`font-mono text-sm tabular-nums ${VALUE_TONE[tone]}`}>
        {value.toLocaleString()}
        {sub ? <span className="ml-1 text-[10px] text-sc-faint">{sub}</span> : null}
      </span>
    </div>
  );
}
