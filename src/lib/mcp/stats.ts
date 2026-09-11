import { readCredentials } from "@/lib/instance-repo";
import { exchangeBearerForAccessToken, type AccessToken } from "@/lib/mcp/access-token";
import { fetchCaseCounts } from "@/lib/mcp/cases";
import { connect, MCP_TIMEOUT_MS } from "@/lib/mcp/connect";
import { EMPTY_COUNTS, EMPTY_STATUS_COUNTS, type InstanceRow, type InstanceStats } from "@/lib/types";

// Access tokens are short-lived; reuse one across polls until it is nearly expired.
const globalForTokens = globalThis as typeof globalThis & { galaxyTokens?: Map<string, AccessToken> };
const tokenCache = (globalForTokens.galaxyTokens ??= new Map<string, AccessToken>());

export function cachedToken(instanceId: string): AccessToken | null {
  const cached = tokenCache.get(instanceId);
  if (cached && cached.expiresAt > Date.now()) return cached;
  tokenCache.delete(instanceId);
  return null;
}

export function forgetToken(instanceId: string): void {
  tokenCache.delete(instanceId);
}

/**
 * One tile's numbers: connect, exchange the configured bearer token for an access token,
 * then list open cases and bucket them by severity.
 * `tenantOverride` (undefined = use the instance's configured tenant) lets a tile's dropdown
 * scope this one request to a different tenant without changing the instance's saved setting.
 */
export async function fetchCaseStats(
  row: InstanceRow,
  range: { from: number; to: number },
  tenantOverride?: string | null,
): Promise<InstanceStats> {
  const startedAt = Date.now();
  const base = {
    instanceId: row.id,
    counts: { ...EMPTY_COUNTS },
    statuses: [] as string[],
    statusCounts: EMPTY_STATUS_COUNTS(),
    total: 0,
    toolUsed: null as string | null,
    fetchedAt: new Date().toISOString(),
  };

  const credentials = readCredentials(row);
  let client;
  try {
    ({ client } = await connect({ mcpUrl: row.mcpUrl, apiKey: credentials.apiKey }));
    const { tools } = await client.listTools(undefined, { timeout: MCP_TIMEOUT_MS });

    let token = cachedToken(row.id);
    if (!token) {
      token = (await exchangeBearerForAccessToken(client, tools, credentials)).token;
      tokenCache.set(row.id, token);
    }

    const cases = await fetchCaseCounts(client, tools, {
      accessToken: token.token,
      tenantId: row.tenantId ?? tenantOverride ?? null,
      toolName: row.toolName,
      toolArgs: row.toolArgs,
      from: range.from,
      to: range.to,
    });

    return {
      ...base,
      status: "ok",
      counts: cases.counts,
      statuses: cases.statuses,
      statusCounts: cases.statusCounts,
      total: cases.total,
      toolUsed: cases.toolName,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    // A stale token is the likeliest cause of a mid-session failure; force a fresh handshake next.
    forgetToken(row.id);
    return {
      ...base,
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown MCP error.",
    };
  } finally {
    await client?.close().catch(() => undefined);
  }
}
