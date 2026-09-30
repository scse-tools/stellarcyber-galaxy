"use client";

import { sourceName } from "@/lib/investigation/ti-catalog";
import type { Finding, InvestigationRun } from "@/lib/investigation/types";

function verdictClass(verdict: string | null | undefined): string {
  const v = (verdict ?? "").toLowerCase();
  if (v.includes("malic")) return "bg-critical text-white";
  if (v.includes("susp")) return "bg-high text-white";
  if (v.includes("benign")) return "bg-[var(--severity-success)] text-white";
  return "bg-sc-active text-sc-muted";
}

function VerdictBadge({ verdict }: { verdict: string | null | undefined }) {
  if (!verdict) return null;
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${verdictClass(verdict)}`}>
      {verdict}
    </span>
  );
}

export function InvestigationRunView({ run }: { run: InvestigationRun }) {
  // Group findings by observable so each shows its source results + the AI assessment together.
  const byObservable = new Map<string, Finding[]>();
  for (const finding of run.findings) {
    const key = `${finding.observableKind}::${finding.observableValue}`;
    if (!byObservable.has(key)) byObservable.set(key, []);
    byObservable.get(key)!.push(finding);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <VerdictBadge verdict={run.verdict} />
        <span className="text-[10px] text-sc-faint">
          {run.providerLabel ?? "AI"} · {new Date(run.createdAt).toLocaleString()}
        </span>
      </div>

      {run.error ? (
        <p className="rounded border border-critical/40 bg-critical/10 px-2 py-1.5 text-[11px] text-critical">{run.error}</p>
      ) : null}

      {run.summary ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sc-faint">Summary</p>
          <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-sc-text">{run.summary}</p>
        </div>
      ) : null}

      {run.recommendation ? (
        <div className="rounded-lg border border-sc-border-soft bg-sc-surface px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sc-accent">Recommendation</p>
          <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-sc-text">{run.recommendation}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-sc-faint">
          Observable findings ({byObservable.size})
        </p>
        {[...byObservable.entries()].map(([key, findings]) => (
          <div key={key} className="rounded-lg border border-sc-border-soft bg-sc-surface px-2.5 py-2">
            <p className="truncate font-mono text-[11px] text-sc-text" title={findings[0].observableValue}>
              {findings[0].observableValue}
            </p>
            <ul className="mt-1 space-y-1">
              {findings.map((finding) => (
                <li key={finding.id} className="flex items-start gap-1.5 text-[11px]">
                  <span className="mt-0.5 shrink-0 rounded bg-sc-active px-1 text-[9px] font-medium text-sc-muted">
                    {finding.source === "ai" ? "AI" : sourceName(finding.source)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <VerdictBadge verdict={finding.verdict} />{" "}
                    <span className="text-sc-muted">{finding.summary}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
