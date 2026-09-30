"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cellText } from "@/lib/table-export";
import { allAlertColumns, columnLabel, compareAlerts } from "@/lib/investigation-columns";
import { useAlertColumns } from "@/lib/use-alert-columns";
import { InvestigationColumnMenu } from "@/components/investigation-column-menu";
import { cn } from "@/lib/utils";
import type { CaseAlert } from "@/lib/types";

interface Props {
  alerts: CaseAlert[];
  loading: boolean;
  error: string | null;
}

/** Alerts for the selected case, with show/hide, reorderable, sortable, persistent columns. */
export function InvestigationAlertsTable({ alerts, loading, error }: Props) {
  const allColumns = useMemo(() => allAlertColumns(alerts), [alerts]);
  const { order, visibleColumns, isVisible, toggle, move, reset } = useAlertColumns(allColumns);
  const [sort, setSort] = useState<{ column: string; dir: "asc" | "desc" } | null>(null);

  const rows = useMemo(() => {
    if (!sort) return alerts;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...alerts].sort((a, b) => factor * compareAlerts(sort.column, a, b));
  }, [alerts, sort]);

  const onSort = (column: string) =>
    setSort((current) =>
      current?.column === column
        ? current.dir === "asc"
          ? { column, dir: "desc" }
          : null
        : { column, dir: "asc" },
    );

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-sc-border-soft bg-sc-surface/50">
      <div className="flex items-center justify-between border-b border-sc-border-soft px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-sc-faint">
          Alerts <span className="text-sc-faint">· {alerts.length}</span>
        </span>
        <InvestigationColumnMenu
          order={order}
          isVisible={isVisible}
          onToggle={toggle}
          onMove={move}
          onReset={reset}
        />
      </div>

      {loading ? (
        <p className="px-3 py-8 text-center text-xs text-sc-faint">Loading alerts…</p>
      ) : error ? (
        <p className="px-3 py-8 text-center text-xs text-critical">{error}</p>
      ) : alerts.length === 0 ? (
        <p className="px-3 py-8 text-center text-xs text-sc-faint">No alerts for this case.</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-sc-surface">
              <tr>
                {visibleColumns.map((column) => {
                  const sorted = sort?.column === column;
                  return (
                    <th
                      key={column}
                      className="whitespace-nowrap border-b border-sc-border-soft px-2.5 py-2 text-left font-medium text-sc-muted"
                    >
                      <button
                        type="button"
                        onClick={() => onSort(column)}
                        className="inline-flex items-center gap-1 hover:text-sc-text"
                        title={column}
                      >
                        {columnLabel(column)}
                        {sorted ? (
                          sort.dir === "asc" ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )
                        ) : null}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((alert, index) => (
                <tr key={alert._id || index} className={cn(index % 2 ? "bg-sc-surface/40" : undefined, "hover:bg-sc-active/50")}>
                  {visibleColumns.map((column) => {
                    const text = cellText(alert[column]);
                    return (
                      <td
                        key={column}
                        className="max-w-[22rem] truncate border-b border-sc-border-soft/60 px-2.5 py-1.5 text-sc-text"
                        title={text}
                      >
                        {text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
