import { SEVERITY_META } from "@/lib/severity";
import { SEVERITIES, type Severity, type SeverityCounts } from "@/lib/types";

// Each open status is drawn as a progressively lighter shade of the severity colour.
const STATUS_OPACITY = [1, 0.5, 0.32, 0.22];

interface SeverityRowsProps {
  counts: SeverityCounts;
  statuses?: string[];
  statusCounts?: Record<Severity, Record<string, number>>;
  muted?: boolean;
}

/**
 * One labelled bar per severity, scaled to the largest bucket so small counts stay visible.
 * When status data is present, each bar is segmented by status (e.g. New vs In Progress).
 */
export function SeverityRows({ counts, statuses, statusCounts, muted }: SeverityRowsProps) {
  const max = Math.max(...SEVERITIES.map((severity) => counts[severity]), 1);
  const hasSplit = Boolean(statuses && statuses.length > 0 && statusCounts);

  return (
    <div className="space-y-2.5">
      <dl className="space-y-2">
        {SEVERITIES.map((severity) => {
          const total = counts[severity];
          const token = SEVERITY_META[severity].token;
          const perStatus = statusCounts?.[severity] ?? {};
          return (
            <div key={severity} className="flex items-center gap-2.5">
              <dt className="flex w-[68px] shrink-0 items-center gap-1.5 text-xs text-sc-muted">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: token, opacity: muted ? 0.35 : 1 }}
                />
                {SEVERITY_META[severity].label}
              </dt>
              <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-sc-active">
                {muted || total === 0 ? null : hasSplit ? (
                  statuses!.map((status, index) => {
                    const value = perStatus[status] ?? 0;
                    if (value === 0) return null;
                    return (
                      <div
                        key={status}
                        title={`${SEVERITY_META[severity].label} · ${status}: ${value.toLocaleString()}`}
                        className="h-full transition-[width] duration-500"
                        style={{
                          width: `${(value / max) * 100}%`,
                          backgroundColor: token,
                          opacity: STATUS_OPACITY[index] ?? 0.22,
                        }}
                      />
                    );
                  })
                ) : (
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${Math.max(2, (total / max) * 100)}%`, backgroundColor: token }}
                  />
                )}
              </div>
              <dd className="w-[72px] shrink-0 text-right font-mono text-sm tabular-nums text-sc-text">
                {muted ? "–" : total.toLocaleString()}
              </dd>
            </div>
          );
        })}
      </dl>

      {hasSplit && !muted ? (
        <div className="flex items-center gap-3 pl-[78px] text-[10px] text-sc-faint">
          {statuses!.map((status, index) => (
            <span key={status} className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="h-2 w-3 rounded-sm bg-sc-muted"
                style={{ opacity: STATUS_OPACITY[index] ?? 0.22 }}
              />
              {status}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
