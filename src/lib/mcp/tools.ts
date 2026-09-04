export interface McpToolLike {
  name: string;
  description?: string;
  inputSchema?: { properties?: Record<string, unknown>; required?: string[] };
}

/** Stellar Cyber's own names, tried before any heuristic. */
export const ACCESS_TOKEN_TOOLS = ["get_access_token", "getAccessToken"];
export const CASE_LIST_TOOLS = ["listCases", "list_cases", "getCases", "get_cases"];

const POSITIVE = [
  { pattern: /\bcount(s)?\b/, score: 6 },
  { pattern: /\bstat(s|istics)?\b/, score: 5 },
  { pattern: /\bseverity\b/, score: 5 },
  { pattern: /\bsummary|summar/, score: 4 },
  { pattern: /\baggregat/, score: 3 },
  { pattern: /\bmetric/, score: 3 },
  { pattern: /\bopen\b/, score: 2 },
  { pattern: /\blist\b/, score: 2 },
  { pattern: /\bsearch|query|get\b/, score: 1 },
];

const NEGATIVE = /\b(create|update|delete|remove|close|assign|comment|attach|escalate|write)\b/;

const byName = (tools: McpToolLike[], names: string[]): McpToolLike | null => {
  for (const name of names) {
    const match = tools.find((tool) => tool.name === name);
    if (match) return match;
  }
  return null;
};

/** The tool that exchanges the configured bearer token for a short-lived access token. */
export function selectAccessTokenTool(tools: McpToolLike[]): McpToolLike | null {
  return (
    byName(tools, ACCESS_TOKEN_TOOLS) ??
    tools.find((tool) => /access.?token|authenticate|\blogin\b/i.test(tool.name)) ??
    null
  );
}

/** The tool that returns cases. Exact Stellar Cyber names win; otherwise rank by wording. */
export function selectCaseTool(
  tools: McpToolLike[],
  preferredName?: string | null,
): McpToolLike | null {
  if (preferredName) return tools.find((tool) => tool.name === preferredName) ?? null;

  const exact = byName(tools, CASE_LIST_TOOLS);
  if (exact) return exact;

  let best: { tool: McpToolLike; score: number } | null = null;
  for (const tool of tools) {
    const haystack = `${tool.name} ${tool.description ?? ""}`.toLowerCase().replace(/[_-]/g, " ");
    if (!/\bcase(s)?\b|\bincident(s)?\b/.test(haystack)) continue;
    if (NEGATIVE.test(haystack)) continue;
    const score = POSITIVE.reduce((sum, r) => sum + (r.pattern.test(haystack) ? r.score : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { tool, score };
  }
  return best?.tool ?? null;
}

const STATUS_KEYS = ["status", "state", "case_status", "caseStatus"];
const SEVERITY_KEYS = ["severity", "severity_level", "severityLevel", "priority"];
const TENANT_KEYS = ["cust_id", "tenant_id", "tenantId", "tenant"];
const FROM_KEYS = ["from_created_at", "fromCreatedAt", "from_modified_at", "from", "start_time"];
const TO_KEYS = ["to_created_at", "toCreatedAt", "to_modified_at", "to", "end_time"];
const TOKEN_KEYS = ["access_token", "accessToken", "token", "auth_token", "authToken", "jwt"];
const BEARER_KEYS = ["bearer_token", "bearerToken", "api_key", "apiKey", "api_token", "refresh_token"];
const USER_KEYS = ["username", "user", "user_id", "email"];
const PASSWORD_KEYS = ["password", "passwd", "secret"];
const LIMIT_KEYS = ["limit", "size", "page_size", "pageSize", "count"];

const pick = (properties: Record<string, unknown>, keys: string[]): string | undefined =>
  keys.find((key) => key in properties);

export interface ToolArgContext {
  tenantId?: string | null;
  accessToken?: string | null;
  bearerToken?: string | null;
  username?: string | null;
  password?: string | null;
  pageLimit?: number;
  /** Exact filter values, spelled the way the instance expects (e.g. "New", "Critical"). */
  status?: string;
  severity?: string;
  fromCreatedAt?: number;
  toCreatedAt?: number;
  overrides?: Record<string, unknown>;
}

/**
 * Fills in only the arguments a tool actually declares, so we never send a Stellar Cyber MCP
 * server a field it does not understand. Explicit overrides always win.
 */
export function buildToolArgs(tool: McpToolLike, context: ToolArgContext = {}) {
  const properties = tool.inputSchema?.properties ?? {};
  const args: Record<string, unknown> = {};
  const set = (keys: string[], value: unknown) => {
    const key = pick(properties, keys);
    if (key && value !== undefined && value !== null && value !== "") args[key] = value;
  };

  set(TOKEN_KEYS, context.accessToken);
  set(BEARER_KEYS, context.bearerToken);
  // A server may call the bearer-token argument plainly `token`; only fall back to that
  // spelling when it declared no bearer-specific field and we are not passing an access token.
  if (!context.accessToken && !pick(properties, BEARER_KEYS)) {
    set(TOKEN_KEYS, context.bearerToken);
  }
  set(USER_KEYS, context.username);
  set(PASSWORD_KEYS, context.password);
  set(TENANT_KEYS, context.tenantId);
  set(STATUS_KEYS, context.status);
  set(SEVERITY_KEYS, context.severity);
  set(FROM_KEYS, context.fromCreatedAt);
  set(TO_KEYS, context.toCreatedAt);
  set(LIMIT_KEYS, context.pageLimit);

  return { ...args, ...(context.overrides ?? {}) };
}

/** True when the tool can filter by both severity and status, so we can count exactly. */
export function supportsFilteredCounts(tool: McpToolLike): boolean {
  const properties = tool.inputSchema?.properties ?? {};
  return Boolean(pick(properties, SEVERITY_KEYS) && pick(properties, STATUS_KEYS));
}

export function parseToolArgs(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
