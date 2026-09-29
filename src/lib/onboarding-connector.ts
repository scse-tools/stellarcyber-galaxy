const CONFIG_PREFIX = "configuration.";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Parses the source connector's `configuration` (a JSON string or object) into an object. */
function parseConf(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isRecord(raw) ? raw : {};
}

/** Coerces a CSV string to match the base value's type (boolean/number/object), else keeps it. */
function coerce(value: string, baseValue: unknown): unknown {
  if (typeof baseValue === "boolean") return value.trim().toLowerCase() === "true";
  if (typeof baseValue === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  if (baseValue !== null && typeof baseValue === "object") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === "string" && value.trim() !== "" ? value.trim().toLowerCase() === "true" : fallback;

/** Parses a filter_list cell: a JSON array, or a comma-separated list, or empty. */
function parseFilterList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* fall through to comma-split */
  }
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Builds the POST /connect/api/v1/connectors body for one onboarding row. `base` is the connector's
 * default fields (from the catalog definition); the row's values override them (`type`/`category`
 * are the immutable keys), config defaults are kept when `includeAllConfig`, and `custId` (resolved
 * from tenant_name) becomes cust_id.
 */
export function buildConnectorPayload(
  base: Record<string, unknown>,
  includeAllConfig: boolean,
  values: Record<string, string>,
  custId: string,
): Record<string, unknown> {
  const baseConf = parseConf(base.configuration);
  const conf: Record<string, unknown> = includeAllConfig ? { ...baseConf } : {};
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith(CONFIG_PREFIX)) {
      const sub = key.slice(CONFIG_PREFIX.length);
      conf[sub] = coerce(value, baseConf[sub]);
    }
  }

  const pick = (key: string, fallback: unknown) =>
    typeof values[key] === "string" && values[key].trim() !== "" ? values[key].trim() : fallback;

  return {
    cust_id: custId,
    name: pick("name", base.name ?? ""),
    // type/category are the immutable keys that identify the connector.
    type: pick("type", base.type ?? ""),
    category: pick("category", base.category ?? ""),
    is_collect: bool(values.is_collect, base.is_collect === true),
    is_respond: bool(values.is_respond, base.is_respond === true),
    run_on: pick("run_on", base.run_on ?? "dp"),
    conf,
    filter_list: parseFilterList(values.filter_list ?? base.filter_list),
    advanced_setting: bool(values.advanced_setting, base.advanced_setting === true),
  };
}
