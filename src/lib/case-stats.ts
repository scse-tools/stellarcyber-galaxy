import { toSeverity } from "@/lib/severity";
import { EMPTY_COUNTS, SEVERITIES, type SeverityCounts } from "@/lib/types";

const STATUS_FIELDS = ["status", "state", "case_status", "caseStatus", "stage"];
const CLOSED_STATUS =
  /\b(closed|resolved|cancell?ed|dismissed|ignored|false.?positive|completed|done)\b/i;

const COUNT_KEYS = ["count", "doc_count", "docCount", "total", "value", "cases", "num", "n"];
const MAX_DEPTH = 6;

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const emptyCounts = (): SeverityCounts => ({ ...EMPTY_COUNTS });

const hasAny = (counts: SeverityCounts) => SEVERITIES.some((s) => counts[s] > 0);

function readCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())) return Number(value);
  if (isRecord(value)) {
    for (const key of COUNT_KEYS) {
      const nested = readCount(value[key]);
      if (nested !== null) return nested;
    }
  }
  return null;
}

/** `{ critical: 4, high: 2 }` and friends, including `{ Critical: { count: 4 } }`. */
function fromSeverityMap(node: Json): SeverityCounts | null {
  const counts = emptyCounts();
  let matched = 0;
  for (const [key, value] of Object.entries(node)) {
    const severity = toSeverity(key);
    if (!severity) continue;
    const count = readCount(value);
    if (count === null) continue;
    counts[severity] += count;
    matched += 1;
  }
  return matched > 0 ? counts : null;
}

/** True when a case row carries a status that means it is no longer open. */
function isClosedCase(item: Json): boolean {
  for (const field of STATUS_FIELDS) {
    const value = item[field];
    if (typeof value === "string" && CLOSED_STATUS.test(value)) return true;
  }
  return false;
}

/** `[{ key: "high", doc_count: 3 }]`, `[{ severity: "High", count: 3 }]`, `[{ severity: "High" }]`. */
function fromCollection(items: unknown[]): SeverityCounts | null {
  const counts = emptyCounts();
  let matched = 0;
  for (const item of items) {
    if (!isRecord(item)) continue;
    // `listCases` may return every case regardless of status; count only the open ones.
    if (isClosedCase(item)) continue;
    const label = item.key ?? item.severity ?? item.name ?? item.label ?? item.level;
    const severity = toSeverity(label);
    if (!severity) continue;
    const count = readCount(item.doc_count ?? item.count ?? item.total ?? item.value);
    counts[severity] += count ?? 1;
    matched += 1;
  }
  return matched > 0 ? counts : null;
}

/** Last resort for prose replies such as "Critical: 4, High: 2". */
export function fromText(text: string): SeverityCounts | null {
  const counts = emptyCounts();
  let matched = 0;
  const pattern = /\b(critical|high|medium|low)\b\W{0,12}?(\d+)/gi;
  for (const [, label, value] of text.matchAll(pattern)) {
    const severity = toSeverity(label);
    if (!severity) continue;
    counts[severity] += Number(value);
    matched += 1;
  }
  return matched > 0 ? counts : null;
}

/** Walks an arbitrary MCP payload looking for something that reads as severity counts. */
export function normalizeSeverityCounts(payload: unknown, depth = 0): SeverityCounts | null {
  if (depth > MAX_DEPTH) return null;
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return normalizeSeverityCounts(JSON.parse(trimmed), depth + 1);
      } catch {
        /* fall through to prose parsing */
      }
    }
    return fromText(trimmed);
  }
  if (Array.isArray(payload)) {
    const direct = fromCollection(payload);
    if (direct && hasAny(direct)) return direct;
    for (const item of payload) {
      const nested = normalizeSeverityCounts(item, depth + 1);
      if (nested && hasAny(nested)) return nested;
    }
    return direct;
  }
  if (!isRecord(payload)) return null;

  if (Array.isArray(payload.buckets)) {
    const buckets = fromCollection(payload.buckets);
    if (buckets) return buckets;
  }
  const direct = fromSeverityMap(payload);
  if (direct && hasAny(direct)) return direct;

  for (const value of Object.values(payload)) {
    const nested = normalizeSeverityCounts(value, depth + 1);
    if (nested && hasAny(nested)) return nested;
  }
  return direct;
}

/** Pulls every plausible payload out of an MCP `CallToolResult` and normalizes the first hit. */
export function extractCaseStats(result: unknown): SeverityCounts | null {
  if (!isRecord(result)) return normalizeSeverityCounts(result);
  const candidates: unknown[] = [result.structuredContent];
  if (Array.isArray(result.content)) {
    for (const block of result.content) {
      if (isRecord(block) && typeof block.text === "string") candidates.push(block.text);
      else candidates.push(block);
    }
  }
  candidates.push(result);
  for (const candidate of candidates) {
    if (candidate === undefined) continue;
    const counts = normalizeSeverityCounts(candidate);
    if (counts && hasAny(counts)) return counts;
  }
  return null;
}
