import { SEVERITY_META } from "@/lib/severity";
import { SEVERITIES, type SeverityCounts } from "@/lib/types";

/**
 * One labelled row per severity, each with its own bar scaled to the largest bucket.
 * Scaling to the max rather than the total keeps small buckets visible when, say,
 * 200k Low cases would otherwise swallow 214 Critical ones.
 */
export function SeverityRows({ counts, muted }: { counts: SeverityCounts; muted?: boolean }) {
  const max = Math.max(...SEVERITIES.map((severity) => counts[severity]), 1);

  return (
    <dl className="space-y-2">
      {SEVERITIES.map((severity) => {
        const count = counts[severity];
        const width = muted || count === 0 ? 0 : Math.max(2, (count / max) * 100);
        return (
          <div key={severity} className="flex items-center gap-2.5">
            <dt className="flex w-[68px] shrink-0 items-center gap-1.5 text-xs text-sc-muted">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: SEVERITY_META[severity].token,
                  opacity: muted ? 0.35 : 1,
                }}
              />
              {SEVERITY_META[severity].label}
            </dt>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sc-active">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${width}%`, backgroundColor: SEVERITY_META[severity].token }}
              />
            </div>
            <dd className="w-[72px] shrink-0 text-right font-mono text-sm tabular-nums text-sc-text">
              {muted ? "–" : count.toLocaleString()}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
