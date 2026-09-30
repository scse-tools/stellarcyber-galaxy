"use client";

import { cn } from "@/lib/utils";
import { SEVERITY_META, toSeverity } from "@/lib/severity";
import type { CaseSummary } from "@/lib/types";

function scoreColor(c: CaseSummary): string {
  const severity = toSeverity(c.severity) ?? (c.score >= 75 ? "critical" : c.score >= 50 ? "high" : c.score >= 25 ? "medium" : "low");
  return SEVERITY_META[severity].token;
}

interface Props {
  cases: CaseSummary[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Narrow left-hand band listing a tile's cases: score, title, alert count, status. */
export function InvestigationCaseBand({ cases, loading, error, selectedId, onSelect }: Props) {
  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-sc-border-soft bg-sc-surface/50">
      <div className="flex items-center justify-between border-b border-sc-border-soft px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-sc-faint">Cases</span>
        <span className="text-[11px] text-sc-faint">{cases.length}</span>
      </div>

      {loading ? (
        <p className="px-3 py-6 text-center text-xs text-sc-faint">Loading cases…</p>
      ) : error ? (
        <p className="px-3 py-6 text-center text-xs text-critical">{error}</p>
      ) : cases.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-sc-faint">No cases for this server.</p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-sc-border-soft overflow-y-auto">
          {cases.map((c) => {
            const active = c.id === selectedId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors",
                    active ? "bg-sc-active" : "hover:bg-sc-active/60",
                  )}
                >
                  <span
                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold text-white"
                    style={{ backgroundColor: scoreColor(c) }}
                    title={`Score ${c.score}`}
                  >
                    {Math.round(c.score)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-sc-text" title={c.name}>
                      {c.name || c.ticketId || c.id}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-[10px] text-sc-faint">
                      <span className="rounded bg-sc-surface px-1.5 py-0.5 tabular-nums">{c.size} alerts</span>
                      <span className="truncate capitalize">{c.status.replace(/_/g, " ") || "—"}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
