import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { extractCaseStats } from "@/lib/case-stats";
import { describe } from "@/lib/mcp/access-token";
import { totalFromResult } from "@/lib/mcp/case-totals";
import { MCP_TIMEOUT_MS } from "@/lib/mcp/connect";
import {
  buildToolArgs,
  parseToolArgs,
  selectCaseTool,
  supportsFilteredCounts,
  type McpToolLike,
} from "@/lib/mcp/tools";
import { totalOf } from "@/lib/severity";
import { EMPTY_COUNTS, SEVERITIES, type Severity, type SeverityCounts } from "@/lib/types";

/**
 * Stellar Cyber's filters are case-sensitive: a case carries `status: "New"` and
 * `severity: "Critical"`, and a lowercase filter value silently matches nothing.
 */
const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Statuses that mean "still open". Override per deployment if these are customised. */
export const OPEN_STATUSES = (process.env.GALAXY_OPEN_STATUSES ?? "New,In Progress")
  .split(",")
  .map((status) => status.trim())
  .filter(Boolean);

const PAGE_LIMIT = Number(process.env.GALAXY_CASE_PAGE_LIMIT ?? 1000);

export interface CaseQuery {
  accessToken: string;
  tenantId?: string | null;
  toolName?: string | null;
  toolArgs?: string | null;
  /**
   * Epoch-millisecond window for `from_created_at` / `to_created_at`. Required in practice:
   * without both bounds the server silently scopes the query to the last 24 hours.
   */
  from: number;
  to: number;
}

export interface CaseQueryResult {
  toolName: string;
  counts: SeverityCounts;
  statuses: string[];
  statusCounts: Record<Severity, Record<string, number>>;
  total: number;
  strategy: "filtered-counts" | "page-tally";
  calls: number;
}

export async function fetchCaseCounts(
  client: Client,
  tools: McpToolLike[],
  query: CaseQuery,
): Promise<CaseQueryResult> {
  const tool = selectCaseTool(tools, query.toolName);
  if (!tool) {
    throw new Error(
      `No case-listing tool found (looked for listCases). Tools seen: ${
        tools.map((t) => t.name).join(", ") || "none"
      }.`,
    );
  }
  return supportsFilteredCounts(tool)
    ? countByFilter(client, tool, query)
    : tallyOnePage(client, tool, query);
}

/**
 * Preferred path: ask the server for a count per (severity, open status) pair with `limit: 1`
 * and read `data.total`. Exact regardless of backlog size, and immune to pagination.
 */
async function countByFilter(
  client: Client,
  tool: McpToolLike,
  query: CaseQuery,
): Promise<CaseQueryResult> {
  const overrides = parseToolArgs(query.toolArgs ?? null);

  const requests = SEVERITIES.flatMap((severity) =>
    OPEN_STATUSES.map(async (status) => {
      const args = buildToolArgs(tool, {
        accessToken: query.accessToken,
        tenantId: query.tenantId,
        severity: SEVERITY_LABELS[severity],
        status,
        fromCreatedAt: query.from,
        toCreatedAt: query.to,
        pageLimit: 1,
        overrides,
      });
      const result = await client.callTool({ name: tool.name, arguments: args }, undefined, {
        timeout: MCP_TIMEOUT_MS,
      });
      if (result.isError) {
        throw new Error(`${tool.name} (${SEVERITY_LABELS[severity]}/${status}): ${describe(result)}`);
      }
      const total = totalFromResult(result);
      if (total === null) {
        throw new Error(
          `${tool.name} returned no case total for ${SEVERITY_LABELS[severity]}/${status}: ${describe(result)}`,
        );
      }
      return { severity, status, total };
    }),
  );

  const counts = { ...EMPTY_COUNTS };
  const statusCounts: Record<Severity, Record<string, number>> = {
    critical: {},
    high: {},
    medium: {},
    low: {},
  };
  for (const { severity, status, total } of await Promise.all(requests)) {
    counts[severity] += total;
    statusCounts[severity][status] = total;
  }
  return {
    toolName: tool.name,
    counts,
    statuses: OPEN_STATUSES,
    statusCounts,
    total: totalOf(counts),
    strategy: "filtered-counts",
    calls: requests.length,
  };
}

/** Fallback for tools without severity/status filters: tally whatever one page returns. */
async function tallyOnePage(
  client: Client,
  tool: McpToolLike,
  query: CaseQuery,
): Promise<CaseQueryResult> {
  const args = buildToolArgs(tool, {
    accessToken: query.accessToken,
    tenantId: query.tenantId,
    fromCreatedAt: query.from,
    toCreatedAt: query.to,
    pageLimit: PAGE_LIMIT,
    overrides: parseToolArgs(query.toolArgs ?? null),
  });
  const result = await client.callTool({ name: tool.name, arguments: args }, undefined, {
    timeout: MCP_TIMEOUT_MS,
  });
  if (result.isError) throw new Error(`${tool.name} returned an error: ${describe(result)}`);

  const counts = extractCaseStats(result);
  if (!counts) {
    throw new Error(`Could not read severity counts from ${tool.name}: ${describe(result)}`);
  }
  return {
    toolName: tool.name,
    counts,
    statuses: [],
    statusCounts: { critical: {}, high: {}, medium: {}, low: {} },
    total: totalOf(counts),
    strategy: "page-tally",
    calls: 1,
  };
}
