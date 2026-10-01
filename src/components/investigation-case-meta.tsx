"use client";

import type { ReactNode } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { cellText } from "@/lib/table-export";
import { cn } from "@/lib/utils";
import { SEVERITY_META, toSeverity } from "@/lib/severity";
import { ttpLabel, ttpUrl, type Ttp } from "@/lib/mitre";
import { InvestigationTtpAnalysis } from "@/components/investigation-ttp-analysis";
import type { CaseDetail } from "@/lib/types";

// Fields surfaced as labelled metadata cards, in this order, when present.
const META_FIELDS: { key: string; label: string }[] = [
  { key: "status", label: "Status" },
  { key: "severity", label: "Severity" },
  { key: "size", label: "Alerts" },
  { key: "assignee_name", label: "Assignee" },
  { key: "tenant_name", label: "Tenant" },
  { key: "ticket_id", label: "Ticket" },
  { key: "created_at", label: "Created" },
  { key: "modified_at", label: "Modified" },
  { key: "created_by_name", label: "Created by" },
  { key: "tags", label: "Tags" },
];

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (/_at$|timestamp|_time$/.test(key)) {
    const date = new Date(typeof value === "number" && value < 1e12 ? value * 1000 : (value as string | number));
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  if (Array.isArray(value)) return value.length ? value.map((v) => cellText(v)).join(", ") : "—";
  return cellText(value);
}

export function InvestigationCaseMeta({
  detail,
  ttps,
  instanceId,
  caseId,
  caseName,
  consoleUrl,
  aiSummary,
}: {
  detail: CaseDetail;
  ttps: Ttp[];
  instanceId: string;
  caseId: string | null;
  caseName: string | null;
  consoleUrl: string | null;
  aiSummary: string | null;
}) {
  const name = cellText(detail.name) || cellText(detail.ticket_id) || cellText(detail._id);
  const score = Number(detail.score) || 0;
  const severity = toSeverity(detail.severity) ?? (score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low");
  const summary = cellText(detail.description) || cellText(detail.summary);

  // Deep link to the case in the Stellar Cyber console.
  const id = caseId || cellText(detail._id);
  let stellarUrl: string | null = null;
  if (consoleUrl && id) {
    try {
      stellarUrl = `${new URL(consoleUrl).origin}/cases/case-detail/${encodeURIComponent(id)}`;
    } catch {
      stellarUrl = null;
    }
  }

  return (
    <section className="rounded-xl border border-sc-border-soft bg-sc-surface/50 p-4">
      <div className="flex items-start gap-3">
        <span
          className="inline-flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg font-mono text-sm font-bold text-white"
          style={{ backgroundColor: SEVERITY_META[severity].token }}
          title="Case score"
        >
          {Math.round(score)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-sc-text" title={name}>
              {name}
            </h3>
            {stellarUrl ? (
              <a
                href={stellarUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open case in Stellar Cyber"
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-sc-border px-1.5 py-0.5 text-[10px] font-medium text-sc-muted transition-colors hover:bg-sc-active hover:text-sc-link"
              >
                Open in Stellar
                <ExternalLink size={11} />
              </a>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="severity" token={SEVERITY_META[severity].token}>
              {SEVERITY_META[severity].label}
            </Badge>
            <Badge>{cellText(detail.status).replace(/_/g, " ") || "unknown"}</Badge>
            {detail.acknowledged ? <Badge>acknowledged</Badge> : null}
          </div>
        </div>
      </div>

      {summary ? <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-sc-muted">{summary}</p> : null}

      {aiSummary ? (
        <div className="mt-3 rounded-lg border border-sc-border-soft bg-sc-active/40 px-3 py-2">
          <p className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-sc-accent">
            <Sparkles size={11} /> AI summary · Stellar Cyber
          </p>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-sc-text">{aiSummary}</p>
        </div>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        {META_FIELDS.filter((f) => f.key in detail).map((f) => (
          <div key={f.key} className="min-w-0">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-sc-faint">{f.label}</dt>
            <dd className="mt-0.5 truncate text-xs text-sc-text" title={formatValue(f.key, detail[f.key])}>
              {formatValue(f.key, detail[f.key])}
            </dd>
          </div>
        ))}
      </dl>

      {ttps.length ? (
        <div className="mt-4 border-t border-sc-border-soft pt-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-sc-faint">
              MITRE ATT&amp;CK <span className="text-sc-faint">· {ttps.length}</span>
            </p>
            <InvestigationTtpAnalysis ttps={ttps} instanceId={instanceId} caseId={caseId} caseName={caseName} />
          </div>
          <div className="flex flex-wrap gap-1">
            {ttps.map((ttp) => {
              const url = ttpUrl(ttp);
              const label = ttpLabel(ttp);
              const cls = cn(
                "inline-flex items-center rounded px-1.5 py-0.5 text-[10px]",
                ttp.kind === "technique" ? "bg-sc-primary/15 text-sc-text" : "bg-sc-active text-sc-muted",
              );
              return url ? (
                <a key={`${ttp.kind}:${ttp.id}:${ttp.name}`} href={url} target="_blank" rel="noopener noreferrer" className={cn(cls, "hover:underline")} title={label}>
                  {label}
                </a>
              ) : (
                <span key={`${ttp.kind}:${ttp.id}:${ttp.name}`} className={cls} title={label}>
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Badge({
  children,
  tone,
  token,
}: {
  children: ReactNode;
  tone?: "severity";
  token?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium capitalize",
        tone === "severity" ? "text-white" : "bg-sc-active text-sc-muted",
      )}
      style={tone === "severity" ? { backgroundColor: token } : undefined}
    >
      {children}
    </span>
  );
}
