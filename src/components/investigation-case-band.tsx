"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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
  const [query, setQuery] = useState("");

  // Highest-scoring cases first; filter by title text as the user types.
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cases
      .filter((c) => !needle || `${c.name} ${c.ticketId}`.toLowerCase().includes(needle))
      .sort((a, b) => b.score - a.score);
  }, [cases, query]);

  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-sc-border-soft bg-sc-surface/50">
      <div className="flex items-center justify-between border-b border-sc-border-soft px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-sc-faint">Cases</span>
        <span className="text-[11px] text-sc-faint">
          {shown.length}
          {shown.length !== cases.length ? ` / ${cases.length}` : ""}
        </span>
      </div>

      <div className="border-b border-sc-border-soft p-2">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sc-faint" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search case titles…"
            className="w-full rounded-md border border-sc-border bg-sc-surface py-1.5 pl-7 pr-2 text-xs text-sc-text placeholder:text-sc-faint focus:border-sc-primary focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <p className="px-3 py-6 text-center text-xs text-sc-faint">Loading cases…</p>
      ) : error ? (
        <p className="px-3 py-6 text-center text-xs text-critical">{error}</p>
      ) : cases.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-sc-faint">No cases for this server.</p>
      ) : shown.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-sc-faint">No cases match “{query}”.</p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-sc-border-soft overflow-y-auto">
          {shown.map((c) => {
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
