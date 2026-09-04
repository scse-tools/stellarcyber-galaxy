import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

const CLIENT_INFO = { name: "stellar-cyber-galaxy", version: "0.1.0" };

export const MCP_TIMEOUT_MS = Number(process.env.GALAXY_MCP_TIMEOUT_MS ?? 15_000);

export type TransportLabel = "streamable-http" | "sse";

export interface McpConnection {
  client: Client;
  transport: TransportLabel;
}

export interface ConnectConfig {
  mcpUrl: string;
  authMode: "bearer" | "basic";
  username: string;
  password: string;
  apiKey: string;
}

/** The configured credential presented as an HTTP header on every MCP request. */
export function authHeaders(config: ConnectConfig): Record<string, string> {
  if (config.authMode === "basic") {
    const encoded = Buffer.from(`${config.username}:${config.password}`).toString("base64");
    return { Authorization: `Basic ${encoded}` };
  }
  return { Authorization: `Bearer ${config.apiKey}` };
}

/** Connects over Streamable HTTP, falling back to SSE for older MCP deployments. */
export async function connect(config: ConnectConfig): Promise<McpConnection> {
  const url = new URL(config.mcpUrl);
  const headers = authHeaders(config);
  const requestInit = { headers };
  // The SSE fallback opens its stream with EventSource, which carries no headers of its own.
  const eventSourceInit = {
    fetch: (input: string | URL | Request, init?: RequestInit) =>
      fetch(input, {
        ...init,
        headers: { ...(init?.headers as Record<string, string>), ...headers },
      }),
  };

  const attempts: Array<{ label: TransportLabel; make: () => Transport }> = [
    { label: "streamable-http", make: () => new StreamableHTTPClientTransport(url, { requestInit }) },
    { label: "sse", make: () => new SSEClientTransport(url, { requestInit, eventSourceInit }) },
  ];

  const failures: string[] = [];
  for (const attempt of attempts) {
    const client = new Client(CLIENT_INFO, { capabilities: {} });
    try {
      await client.connect(attempt.make());
      return { client, transport: attempt.label };
    } catch (error) {
      failures.push(`${attempt.label}: ${error instanceof Error ? error.message : String(error)}`);
      await client.close().catch(() => undefined);
    }
  }
  throw new Error(`MCP endpoint unreachable (${failures.join(" | ")})`);
}
