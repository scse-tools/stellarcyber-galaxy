import { proxiedFetch } from "@/lib/console/fetch";
import { readCredentials } from "@/lib/instance-repo";
import type { InstanceRow } from "@/lib/types";

const ACCESS_TOKEN_PATH = "/connect/api/v1/access_token";
const DEFAULT_TTL_SECONDS = 600;

interface CachedToken {
  token: string;
  expiresAt: number;
}

// Access tokens are short-lived; reuse per instance until just before expiry.
const globalForRest = globalThis as typeof globalThis & {
  galaxyRestTokens?: Map<string, CachedToken>;
};
const cache = (globalForRest.galaxyRestTokens ??= new Map<string, CachedToken>());

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function readToken(payload: unknown): { token: string; expSeconds: number | null } | null {
  if (!isRecord(payload)) return null;
  const node = isRecord(payload.data) ? payload.data : payload;
  const token = node.access_token ?? node.accessToken ?? node.token;
  if (typeof token !== "string" || token.length < 16) return null;
  const exp = node.exp ?? node.expires_in ?? node.expiresIn;
  return { token, expSeconds: typeof exp === "number" ? exp : null };
}

/** Trades the instance's API key for a REST access token, mirroring the console/MCP auth. */
export async function getRestAccessToken(row: InstanceRow): Promise<string> {
  const cached = cache.get(row.id);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const { apiKey } = readCredentials(row);
  const origin = new URL(row.consoleUrl).origin;
  const response = await proxiedFetch(`${origin}${ACCESS_TOKEN_PATH}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  });
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "The API key was rejected (401) when requesting an access token."
        : `access_token request failed (HTTP ${response.status}).`,
    );
  }

  const parsed = readToken(await response.json().catch(() => null));
  if (!parsed) throw new Error("access_token response contained no token.");

  // `exp` is an absolute epoch (seconds); expires_in is a duration. Handle both, refresh early.
  const now = Date.now();
  const expiresAt =
    parsed.expSeconds === null
      ? now + DEFAULT_TTL_SECONDS * 1000
      : parsed.expSeconds > now / 1000 + 5
        ? parsed.expSeconds * 1000
        : now + parsed.expSeconds * 1000;
  cache.set(row.id, { token: parsed.token, expiresAt: expiresAt - 60_000 });
  return parsed.token;
}

export function forgetRestAccessToken(instanceId: string): void {
  cache.delete(instanceId);
}
