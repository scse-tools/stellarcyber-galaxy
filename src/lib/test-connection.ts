import type { McpTestResult } from "@/lib/types";

export interface TestConnectionPayload {
  instanceId?: string;
  mcpUrl?: string;
  apiKey?: string;
  tenantId?: string;
  toolName?: string;
  toolArgs?: string;
  from?: number;
  to?: number;
}

/** Runs the connect → get_access_token → listCases probe on the server and returns each step. */
export async function testConnection(payload: TestConnectionPayload): Promise<McpTestResult> {
  const response = await fetch("/api/mcp/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as {
    result?: McpTestResult;
    error?: string;
  };
  if (!response.ok || !body.result) {
    throw new Error(body.error ?? "The connection test could not be run.");
  }
  return body.result;
}
