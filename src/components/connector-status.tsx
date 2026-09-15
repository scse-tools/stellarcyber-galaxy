"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ConnectorStatus } from "@/lib/types";

/** Collecting-connector health on a single line: active, healthy, and issues. */
export function ConnectorStatusBlock({
  connectors,
  loading,
  action,
  onStatus,
}: {
  connectors?: ConnectorStatus;
  loading?: boolean;
  action?: ReactNode;
  onStatus?: (key: string, label: string) => void;
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
        <div className="flex items-stretch gap-2">
          <Metric label="Active" value={connectors.active} sub={`of ${connectors.total}`} onClick={onStatus && (() => onStatus("active", "Active"))} />
          <Metric label="Healthy" value={connectors.healthy} tone="good" onClick={onStatus && (() => onStatus("healthy", "Healthy"))} />
          <Metric label="Issues" value={connectors.issues} tone={connectors.issues > 0 ? "bad" : "good"} onClick={onStatus && (() => onStatus("issues", "Issues"))} />
        </div>
      )}
    </section>
  );
}

type Tone = "neutral" | "good" | "bad";
const TONE: Record<Tone, { dot: string; value: string }> = {
  neutral: { dot: "bg-sc-faint", value: "text-sc-text" },
  good: { dot: "bg-[var(--severity-success)]", value: "text-sc-text" },
  bad: { dot: "bg-critical", value: "text-critical" },
};

function Metric({
  label,
  value,
  sub,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: Tone;
  onClick?: (() => void) | false;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        <span aria-hidden className={cn("size-2 rounded-full", TONE[tone].dot)} />
        <span className={cn("font-mono text-base tabular-nums", TONE[tone].value)}>
          {value.toLocaleString()}
        </span>
        {sub ? <span className="text-[10px] text-sc-faint">{sub}</span> : null}
      </div>
      <p className="mt-0.5 truncate text-[10px] uppercase tracking-wide text-sc-faint">{label}</p>
    </>
  );
  const base =
    "min-w-0 flex-1 overflow-hidden rounded-md border border-sc-border-soft bg-sc-raised/40 px-2.5 py-1.5 text-left";
  if (!onClick) return <div className={base}>{inner}</div>;
  return (
    <button
      type="button"
      title={`Show ${label} in the table`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(base, "transition-colors hover:border-sc-link hover:bg-sc-active")}
    >
      {inner}
    </button>
  );
}
