"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, PanelRightOpen } from "lucide-react";
import { allAlertColumns, columnLabel, compareAlerts, displayAlertCell } from "@/lib/investigation-columns";
import { useAlertColumns } from "@/lib/use-alert-columns";
import { InvestigationColumnMenu } from "@/components/investigation-column-menu";
import { InvestigationAlertDetail } from "@/components/investigation-alert-detail";
import { alertId } from "@/lib/observables";
import { cn } from "@/lib/utils";
import type { CaseAlert } from "@/lib/types";

interface Props {
  alerts: CaseAlert[];
  loading: boolean;
  error: string | null;
  /** When non-null, only alerts whose id is in this set are shown (observable filter). */
  filterIds: Set<string> | null;
  activeAlertId: string | null;
  onSelectAlert: (id: string) => void;
}

/** Alerts for the selected case, with show/hide, reorderable, sortable, persistent columns. */
export function InvestigationAlertsTable({ alerts, loading, error, filterIds, activeAlertId, onSelectAlert }: Props) {
  // Columns are computed from the full alert set so they stay stable while filtering.
  const allColumns = useMemo(() => allAlertColumns(alerts), [alerts]);
  const { order, visibleColumns, isVisible, toggle, move, reset } = useAlertColumns(allColumns);
  const [sort, setSort] = useState<{ column: string; dir: "asc" | "desc" } | null>(null);
  const [detail, setDetail] = useState<CaseAlert | null>(null);

  const rows = useMemo(() => {
    const withId = alerts.map((alert, index) => ({ alert, id: alertId(alert, index) }));
    const filtered = filterIds ? withId.filter((row) => filterIds.has(row.id)) : withId;
    if (!sort) return filtered;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => factor * compareAlerts(sort.column, a.alert, b.alert));
  }, [alerts, filterIds, sort]);

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
          Alerts{" "}
          <span className="text-sc-faint">
            · {filterIds ? `${rows.length} of ${alerts.length}` : alerts.length}
            {filterIds ? " (filtered)" : ""}
          </span>
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
                <th className="w-8 border-b border-sc-border-soft px-2 py-2" aria-label="Details" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ alert, id }, index) => {
                const active = id === activeAlertId;
                return (
                  <tr
                    key={id || index}
                    onClick={() => onSelectAlert(id)}
                    aria-selected={active}
                    className={cn(
                      "cursor-pointer",
                      active ? "bg-sc-primary/15" : index % 2 ? "bg-sc-surface/40" : undefined,
                      "hover:bg-sc-active/50",
                    )}
                  >
                    {visibleColumns.map((column) => {
                      const text = displayAlertCell(column, alert[column]);
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
                    <td className="border-b border-sc-border-soft/60 px-1.5 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetail(alert);
                        }}
                        aria-label="Open alert detail"
                        title="Alert detail"
                        className="rounded p-1 text-sc-faint hover:bg-sc-active hover:text-sc-text"
                      >
                        <PanelRightOpen size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <InvestigationAlertDetail alert={detail} onClose={() => setDetail(null)} />
    </section>
  );
}
