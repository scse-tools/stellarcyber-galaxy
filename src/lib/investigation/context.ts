import { cellText } from "@/lib/table-export";
import { ttpLabel, type Ttp } from "@/lib/mitre";
import type { ObservableGroup } from "@/lib/observables";
import type { CaseDetail } from "@/lib/types";

// Safety cap on the context handed to the LLM. Case facts + TTPs + observables are small (a few KB
// even for large cases), so this is rarely approached — it just guards against pathological inputs.
const MAX_CONTEXT_CHARS = Number(process.env.NEXT_PUBLIC_GALAXY_LLM_CONTEXT_CHARS ?? 60_000);

const MAX_VALUES_PER_GROUP = 200;

/**
 * Builds a compact text block describing the open case — headline facts, MITRE ATT&CK TTPs, and the
 * pooled observables — for the LLM to use when answering prompts. Raw alert data is intentionally
 * excluded to keep well within model context windows.
 */
export function buildCaseContext(
  detail: CaseDetail | null,
  alertCount: number,
  ttps: Ttp[],
  groups: ObservableGroup[],
  maxChars = MAX_CONTEXT_CHARS,
): string {
  const lines: string[] = [];

  if (detail) {
    const name = cellText(detail.name) || cellText(detail.ticket_id) || cellText(detail._id);
    lines.push(
      `Case: ${name} | score ${cellText(detail.score) || "?"} | severity ${cellText(detail.severity) || "?"} | status ${cellText(detail.status) || "?"} | ${alertCount} alerts`,
    );
    const description = cellText(detail.description) || cellText(detail.summary);
    if (description) lines.push(`Description: ${description}`);
  } else {
    lines.push(`Case with ${alertCount} alerts.`);
  }

  if (ttps.length) {
    lines.push("", `MITRE ATT&CK: ${ttps.map(ttpLabel).join("; ")}`);
  }

  if (groups.length) {
    lines.push("", "Observables:");
    for (const group of groups) {
      const values = group.observables
        .slice(0, MAX_VALUES_PER_GROUP)
        .map((o) => (o.count > 1 ? `${o.value} (x${o.count})` : o.value));
      const more = group.observables.length - values.length;
      lines.push(`- ${group.label}: ${values.join(", ")}${more > 0 ? `, +${more} more` : ""}`);
    }
  }

  const text = lines.join("\n");
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n(truncated)` : text;
}
