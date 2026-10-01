"use client";

import { sourceName } from "@/lib/investigation/ti-catalog";
import type { Finding, InvestigationRun } from "@/lib/investigation/types";

type Status = { label: string; cls: string };

/** Classifies one finding into a status pill: finding / clean / info / no data / error. */
function statusOf(finding: Finding): Status {
  const verdict = (finding.verdict ?? "").toLowerCase();
  const failed = (finding.summary ?? "").toLowerCase().includes("failed") || (finding.summary ?? "").toLowerCase().includes("not supported");
  if (verdict.includes("malic")) return { label: "finding", cls: "bg-critical text-white" };
  if (verdict.includes("susp")) return { label: "finding", cls: "bg-high text-white" };
  if (verdict.includes("benign")) return { label: "clean", cls: "bg-[var(--severity-success)] text-white" };
  if (verdict === "info") return { label: "info", cls: "bg-sc-primary/20 text-sc-text" };
  if (failed) return { label: "error", cls: "bg-critical/20 text-critical" };
  return { label: "no data", cls: "bg-sc-active text-sc-faint" };
}

function overallClass(verdict: string | null | undefined): string {
  const v = (verdict ?? "").toLowerCase();
  if (v.includes("malic")) return "bg-critical text-white";
  if (v.includes("susp")) return "bg-high text-white";
  if (v.includes("benign")) return "bg-[var(--severity-success)] text-white";
  return "bg-sc-active text-sc-muted";
}

export function InvestigationRunView({ run }: { run: InvestigationRun }) {
  // Group findings by observable; keep AI assessment separate from live-source results.
  const byObservable = new Map<string, Finding[]>();
  for (const finding of run.findings) {
    const key = `${finding.observableKind}::${finding.observableValue}`;
    if (!byObservable.has(key)) byObservable.set(key, []);
    byObservable.get(key)!.push(finding);
  }

  const sourceFindings = run.findings.filter((f) => f.source !== "ai");
  const hits = sourceFindings.filter((f) => statusOf(f).label === "finding").length;
  const errors = sourceFindings.filter((f) => statusOf(f).label === "error").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${overallClass(run.verdict)}`}>
          {run.verdict ?? "n/a"}
        </span>
        <span className="text-[10px] text-sc-faint">
          {run.providerLabel ?? "AI"} · {new Date(run.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Coverage line: what was checked. */}
      <p className="text-[10px] text-sc-faint">
        {byObservable.size} observable{byObservable.size === 1 ? "" : "s"} · {sourceFindings.length} source check
        {sourceFindings.length === 1 ? "" : "s"} · {hits} finding{hits === 1 ? "" : "s"}
        {errors ? ` · ${errors} failed` : ""}
      </p>

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
          Per-observable ({byObservable.size})
        </p>
        {[...byObservable.entries()].map(([key, findings]) => (
          <ObservableCard key={key} findings={findings} />
        ))}
      </div>
    </div>
  );
}

function ObservableCard({ findings }: { findings: Finding[] }) {
  const ai = findings.find((f) => f.source === "ai");
  const sources = findings.filter((f) => f.source !== "ai");

  return (
    <div className="rounded-lg border border-sc-border-soft bg-sc-surface px-2.5 py-2">
      <p className="truncate font-mono text-[11px] text-sc-text" title={findings[0].observableValue}>
        {findings[0].observableValue}
      </p>

      {ai?.summary ? (
        <p className="mt-1 rounded bg-sc-active/60 px-1.5 py-1 text-[11px] leading-relaxed text-sc-text">
          <span className="font-semibold text-sc-accent">AI: </span>
          {ai.summary}
        </p>
      ) : null}

      {sources.length ? (
        <ul className="mt-1.5 space-y-1">
          {sources.map((finding) => {
            const status = statusOf(finding);
            return (
              <li key={finding.id} className="flex items-start gap-1.5 text-[11px]">
                <span className="mt-0.5 w-24 shrink-0 truncate text-sc-muted" title={sourceName(finding.source)}>
                  {sourceName(finding.source)}
                </span>
                <span className={`mt-0.5 shrink-0 rounded px-1 text-[9px] font-semibold ${status.cls}`}>{status.label}</span>
                <span className="min-w-0 flex-1 break-words text-sc-muted">{finding.summary}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-1 text-[10px] text-sc-faint">No live sources checked this observable type.</p>
      )}
    </div>
  );
}
