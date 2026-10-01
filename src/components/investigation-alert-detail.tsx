"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cellText } from "@/lib/table-export";
import { displayAlertCell } from "@/lib/investigation-columns";
import { SEVERITY_META, toSeverity } from "@/lib/severity";
import type { CaseAlert } from "@/lib/types";

// Headline fields surfaced as cards when present, in this order.
const HIGHLIGHTS: { key: string; label: string }[] = [
  { key: "event_name", label: "Event" },
  { key: "event_category", label: "Category" },
  { key: "event_type", label: "Type" },
  { key: "event_status", label: "Status" },
  { key: "severity", label: "Severity" },
  { key: "fidelity", label: "Fidelity" },
  { key: "event_score", label: "Score" },
  { key: "srcip", label: "Source IP" },
  { key: "dstip", label: "Dest IP" },
  { key: "tenant_name", label: "Tenant" },
];

/** Flattens an alert into dotted path → scalar value pairs for the searchable field list. */
function flatten(value: unknown, prefix: string, out: [string, string][]): [string, string][] {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    value.forEach((item, i) => flatten(item, `${prefix}[${i}]`, out));
    return out;
  }
  if (typeof value === "object") {
    for (const [key, val] of Object.entries(value)) flatten(val, prefix ? `${prefix}.${key}` : key, out);
    return out;
  }
  out.push([prefix, String(value)]);
  return out;
}

export function InvestigationAlertDetail({ alert, onClose }: { alert: CaseAlert | null; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const raw = useMemo(() => (alert ? JSON.stringify(alert, null, 2) : ""), [alert]);
  const fields = useMemo(() => (alert ? flatten(alert, "", []).sort((a, b) => a[0].localeCompare(b[0])) : []), [alert]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? fields.filter(([k, v]) => `${k} ${v}`.toLowerCase().includes(needle)) : fields;
  }, [fields, query]);

  if (!alert) return null;

  const title = cellText(alert.event_name) || cellText(alert.event_display_name) || cellText(alert._id) || "Alert";
  const score = Number(alert.event_score ?? alert.severity) || 0;
  const severity = toSeverity(alert.severity) ?? (score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  const highlights = HIGHLIGHTS.filter((h) => h.key in alert && cellText(alert[h.key]) !== "");

  return (
    <Modal open title="Alert detail" onClose={onClose} className="max-w-3xl">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold text-white"
            style={{ backgroundColor: SEVERITY_META[severity].token }}
          >
            {Math.round(score)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-sc-text" title={title}>
              {title}
            </h3>
            <p className="text-[11px] text-sc-faint">{SEVERITY_META[severity].label}</p>
          </div>
        </div>

        {highlights.length ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {highlights.map((h) => {
              const text = displayAlertCell(h.key, alert[h.key]);
              return (
                <div key={h.key} className="min-w-0">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-sc-faint">{h.label}</dt>
                  <dd className="mt-0.5 truncate text-xs text-sc-text" title={text}>
                    {text}
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : null}

        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sc-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this alert's fields…"
            className="w-full rounded-md border border-sc-border bg-sc-surface py-1.5 pl-7 pr-2 text-xs text-sc-text placeholder:text-sc-faint focus:border-sc-primary focus:outline-none"
          />
        </div>

        <div className="max-h-72 overflow-auto rounded-lg border border-sc-border-soft">
          <table className="w-full border-collapse text-xs">
            <tbody>
              {filtered.map(([key, value]) => (
                <tr key={key} className="border-b border-sc-border-soft/60 last:border-0">
                  <td className="w-1/3 whitespace-nowrap px-2.5 py-1 align-top font-mono text-[11px] text-sc-muted">{key}</td>
                  <td className="break-words px-2.5 py-1 text-sc-text">{value}</td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-2.5 py-3 text-center text-sc-faint">No fields match “{query}”.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowRaw((v) => !v)}
              className="text-[11px] font-medium text-sc-link hover:underline"
            >
              {showRaw ? "Hide" : "Show"} raw JSON
            </button>
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex items-center gap-1.5 rounded-md border border-sc-border px-2 py-1 text-[11px] text-sc-muted hover:bg-sc-active hover:text-sc-text"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy raw JSON"}
            </button>
          </div>
          {showRaw ? (
            <pre className="max-h-72 overflow-auto rounded-lg border border-sc-border-soft bg-sc-surface p-3 font-mono text-[11px] leading-relaxed text-sc-text">
              {raw}
            </pre>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
