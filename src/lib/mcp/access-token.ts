import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { MCP_TIMEOUT_MS } from "@/lib/mcp/connect";
import { buildToolArgs, selectAccessTokenTool, type McpToolLike } from "@/lib/mcp/tools";

const TOKEN_FIELDS = ["access_token", "accessToken", "token", "jwt", "id_token", "bearer"];
const EXPIRY_FIELDS = ["expires_in", "expiresIn", "expires", "ttl"];
const MAX_DEPTH = 5;
const DEFAULT_TTL_SECONDS = 600;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const looksLikeToken = (value: string) => value.length >= 16 && !/\s/.test(value.trim());

export interface AccessToken {
  token: string;
  expiresAt: number;
}

/** Digs the access token out of whatever shape `get_access_token` replied with. */
export function extractAccessToken(payload: unknown, depth = 0): AccessToken | null {
  if (depth > MAX_DEPTH) return null;

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return extractAccessToken(JSON.parse(trimmed), depth + 1);
      } catch {
        /* not JSON - fall through */
      }
    }
    return looksLikeToken(trimmed) ? { token: trimmed, expiresAt: expiryFrom(null) } : null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractAccessToken(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (!isRecord(payload)) return null;

  for (const field of TOKEN_FIELDS) {
    const value = payload[field];
    if (typeof value === "string" && looksLikeToken(value)) {
      return { token: value.trim(), expiresAt: expiryFrom(payload) };
    }
  }
  for (const value of Object.values(payload)) {
    const found = extractAccessToken(value, depth + 1);
    if (found) return found;
  }
  return null;
}

function expiryFrom(payload: Record<string, unknown> | null): number {
  const raw = payload
    ? EXPIRY_FIELDS.map((field) => payload[field]).find(
        (value) => typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value)),
      )
    : undefined;
  const seconds = raw === undefined ? DEFAULT_TTL_SECONDS : Number(raw);
  // Re-authenticate a minute early so a token never expires mid-poll.
  return Date.now() + Math.max(30, seconds - 60) * 1000;
}

export interface TokenExchange {
  toolName: string;
  token: AccessToken;
}

/** Runs the `get_access_token` handshake that every Stellar Cyber MCP server requires. */
export async function exchangeBearerForAccessToken(
  client: Client,
  tools: McpToolLike[],
  credentials: { apiKey: string },
): Promise<TokenExchange> {
  const tool = selectAccessTokenTool(tools);
  if (!tool) {
    throw new Error(
      `This MCP server exposes no access-token tool (looked for ${"get_access_token"}). Tools seen: ${
        tools.map((t) => t.name).join(", ") || "none"
      }.`,
    );
  }

  const args = buildToolArgs(tool, { bearerToken: credentials.apiKey });
  const result = await client.callTool({ name: tool.name, arguments: args }, undefined, {
    timeout: MCP_TIMEOUT_MS,
  });
  if (result.isError) {
    throw new Error(`${tool.name} rejected the bearer token: ${describe(result)}`);
  }

  const token = extractAccessToken(result.structuredContent) ?? extractAccessToken(result.content);
  if (!token) {
    throw new Error(`${tool.name} returned no access_token: ${describe(result)}`);
  }
  return { toolName: tool.name, token };
}

/** First line of a tool result, for error messages. Never includes a token we parsed out. */
export function describe(result: unknown): string {
  if (!isRecord(result) || !Array.isArray(result.content)) return "no content";
  const text = result.content
    .map((block) => (isRecord(block) && typeof block.text === "string" ? block.text : ""))
    .filter(Boolean)
    .join(" ")
    .slice(0, 200);
  return text || "no text content";
}
