const TOTAL_KEYS = ["total", "total_count", "totalCount", "count", "hits", "size"];
const MAX_DEPTH = 5;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Reads the result count out of a `listCases` reply. Stellar Cyber wraps it as
 * `{ data: { total, cases } }`, but the total is looked up wherever it sits.
 */
export function extractTotal(payload: unknown, depth = 0): number | null {
  if (depth > MAX_DEPTH) return null;

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
    try {
      return extractTotal(JSON.parse(trimmed), depth + 1);
    } catch {
      return null;
    }
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractTotal(item, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  if (!isRecord(payload)) return null;

  for (const key of TOTAL_KEYS) {
    const value = payload[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
    if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  }
  for (const value of Object.values(payload)) {
    const found = extractTotal(value, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

/** Pulls the total out of a full MCP `CallToolResult`. */
export function totalFromResult(result: unknown): number | null {
  if (!isRecord(result)) return extractTotal(result);
  const fromStructured = extractTotal(result.structuredContent);
  if (fromStructured !== null) return fromStructured;
  if (Array.isArray(result.content)) {
    for (const block of result.content) {
      if (isRecord(block) && typeof block.text === "string") {
        const found = extractTotal(block.text);
        if (found !== null) return found;
      }
    }
  }
  return null;
}
