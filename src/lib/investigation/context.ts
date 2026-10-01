import { cellText } from "@/lib/table-export";
import { ttpLabel, type Ttp } from "@/lib/mitre";
import type { CaseAlert, CaseDetail } from "@/lib/types";

// Character budget for the case context handed to the LLM. Large enough to carry real alert data,
// but bounded so requests don't blow past a model's context window outright.
const MAX_CONTEXT_CHARS = Number(process.env.NEXT_PUBLIC_GALAXY_LLM_CONTEXT_CHARS ?? 60_000);

/**
 * Builds a text block describing the open case — headline facts, MITRE ATT&CK TTPs, and the raw
 * alert JSON (as many alerts as fit the budget) — so the LLM can answer prompts with full context.
 */
export function buildCaseContext(
  detail: CaseDetail | null,
  alerts: CaseAlert[],
  ttps: Ttp[],
  maxChars = MAX_CONTEXT_CHARS,
): string {
  const lines: string[] = [];
  if (detail) {
    const name = cellText(detail.name) || cellText(detail.ticket_id) || cellText(detail._id);
    lines.push(
      `Case: ${name} | score ${cellText(detail.score) || "?"} | severity ${cellText(detail.severity) || "?"} | status ${cellText(detail.status) || "?"} | ${alerts.length} alerts`,
    );
    const description = cellText(detail.description) || cellText(detail.summary);
    if (description) lines.push(`Description: ${description}`);
  } else {
    lines.push(`Case with ${alerts.length} alerts.`);
  }

  if (ttps.length) {
    lines.push(`MITRE ATT&CK: ${ttps.map(ttpLabel).join("; ")}`);
  }

  lines.push("", "Alerts (raw JSON):");
  const header = lines.join("\n");

  // Append alerts until the character budget is exhausted.
  const included: string[] = [];
  let used = header.length;
  for (const alert of alerts) {
    const json = JSON.stringify(alert);
    if (used + json.length + 2 > maxChars) break;
    included.push(json);
    used += json.length + 2;
  }

  let body = `[${included.join(",\n")}]`;
  if (included.length < alerts.length) {
    body += `\n(truncated: included ${included.length} of ${alerts.length} alerts to fit the context budget)`;
  }
  return `${header}\n${body}`;
}
