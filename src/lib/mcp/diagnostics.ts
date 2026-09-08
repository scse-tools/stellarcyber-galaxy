import { exchangeBearerForAccessToken } from "@/lib/mcp/access-token";
import { fetchCaseCounts } from "@/lib/mcp/cases";
import { connect, MCP_TIMEOUT_MS, type ConnectConfig } from "@/lib/mcp/connect";
import { ACCESS_TOKEN_TOOLS, CASE_LIST_TOOLS, type McpToolLike } from "@/lib/mcp/tools";
import type { McpTestResult, McpTestStep } from "@/lib/types";

export interface DiagnosticsConfig extends ConnectConfig {
  tenantId?: string | null;
  toolName?: string | null;
  toolArgs?: string | null;
  from: number;
  to: number;
}

/**
 * Walks the exact sequence a tile depends on and reports each step, so a broken connection
 * says *which* part broke: reachability, the token handshake, or the case query.
 */
export async function runDiagnostics(config: DiagnosticsConfig): Promise<McpTestResult> {
  const steps: McpTestStep[] = [];
  const result: McpTestResult = { ok: false, transport: null, steps };

  const step = async <T>(name: string, run: () => Promise<T>): Promise<T | null> => {
    const startedAt = Date.now();
    try {
      const value = await run();
      steps.push({ name, status: "ok", detail: detailOf(value), ms: Date.now() - startedAt });
      return value;
    } catch (error) {
      steps.push({
        name,
        status: "fail",
        detail: error instanceof Error ? error.message : String(error),
        ms: Date.now() - startedAt,
      });
      return null;
    }
  };

  const connection = await step("Connect to MCP endpoint", async () => {
    const opened = await connect(config);
    result.transport = opened.transport;
    return opened;
  });
  if (!connection) return skipRest(result, ["List tools", "get_access_token", "listCases"]);

  try {
    const tools = await step("List tools", async () => {
      const { tools: found } = await connection.client.listTools(undefined, {
        timeout: MCP_TIMEOUT_MS,
      });
      return found as McpToolLike[];
    });
    if (!tools) return skipRest(result, ["get_access_token", "listCases"]);

    const exchange = await step("get_access_token", () =>
      exchangeBearerForAccessToken(connection.client, tools, { apiKey: config.apiKey }),
    );
    if (!exchange) return skipRest(result, ["listCases"]);

    const cases = await step("listCases", () =>
      fetchCaseCounts(connection.client, tools, {
        accessToken: exchange.token.token,
        tenantId: config.tenantId,
        toolName: config.toolName,
        toolArgs: config.toolArgs,
        from: config.from,
        to: config.to,
      }),
    );
    if (cases) {
      result.counts = cases.counts;
      result.total = cases.total;
      result.toolUsed = cases.toolName;
    }
  } finally {
    await connection.client.close().catch(() => undefined);
  }

  result.ok = steps.every((entry) => entry.status === "ok");
  return result;
}

function skipRest(result: McpTestResult, names: string[]): McpTestResult {
  for (const name of names) {
    result.steps.push({ name, status: "skipped", detail: "Skipped after an earlier failure.", ms: 0 });
  }
  return result;
}

/** Human-readable success detail. Deliberately never echoes token material. */
function detailOf(value: unknown): string {
  if (value && typeof value === "object") {
    if ("transport" in value) {
      return `Connected over ${String((value as { transport: string }).transport)}.`;
    }
    if (Array.isArray(value)) {
      const names = (value as McpToolLike[]).map((tool) => tool.name);
      const has = (candidates: string[]) => names.some((name) => candidates.includes(name));
      return [
        `${names.length} tool${names.length === 1 ? "" : "s"}`,
        has(ACCESS_TOKEN_TOOLS) ? "get_access_token present" : "no get_access_token",
        has(CASE_LIST_TOOLS) ? "listCases present" : "no listCases",
      ].join(" · ");
    }
    if ("token" in value) {
      const { token, toolName } = value as { token: { token: string; expiresAt: number }; toolName: string };
      const minutes = Math.max(0, Math.round((token.expiresAt - Date.now()) / 60_000));
      return `${toolName} returned an access token (${token.token.length} chars, reusable ~${minutes}m).`;
    }
    if ("counts" in value) {
      const { toolName, total, counts, strategy, calls } = value as {
        toolName: string;
        total: number;
        counts: Record<string, number>;
        strategy: string;
        calls: number;
      };
      const how =
        strategy === "filtered-counts"
          ? `${calls} filtered count queries`
          : "one page, tallied locally";
      return `${toolName}: ${total.toLocaleString()} open (Critical ${counts.critical}, High ${counts.high}, Medium ${counts.medium}, Low ${counts.low}) via ${how}.`;
    }
  }
  return "OK";
}
