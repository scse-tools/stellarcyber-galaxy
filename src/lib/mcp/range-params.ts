const DAY_MS = 24 * 60 * 60 * 1000;

const asEpoch = (raw: string | null): number | null => {
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;
};

/**
 * Reads the tile window from `?from=&to=` epoch-millisecond params, defaulting to the last
 * 24 hours — the same window `listCases` would apply on its own.
 */
export function rangeFromParams(params: URLSearchParams): { from: number; to: number } {
  const now = Date.now();
  const from = asEpoch(params.get("from"));
  const to = asEpoch(params.get("to"));
  if (from !== null && to !== null && from < to) return { from, to };
  return { from: now - DAY_MS, to: now };
}

/** Same defaulting for a JSON body, used by the connection test. */
export function rangeFromBody(body: { from?: unknown; to?: unknown }): { from: number; to: number } {
  const params = new URLSearchParams();
  if (typeof body.from === "number") params.set("from", String(body.from));
  if (typeof body.to === "number") params.set("to", String(body.to));
  return rangeFromParams(params);
}
