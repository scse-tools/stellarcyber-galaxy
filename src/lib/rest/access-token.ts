import { proxiedFetch } from "@/lib/http";
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

export interface RestAuthConfig {
  /** Cache key — an instance id, or a synthetic key for an ad-hoc (unsaved) preview. */
  id: string;
  consoleUrl: string;
  apiKey: string;
}

/** Trades an API key for a REST access token, given explicit credentials. */
export async function getRestAccessTokenWith(config: RestAuthConfig): Promise<string> {
  const cached = cache.get(config.id);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const { apiKey } = config;
  const origin = new URL(config.consoleUrl).origin;
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
  cache.set(config.id, { token: parsed.token, expiresAt: expiresAt - 60_000 });
  return parsed.token;
}

/** Trades the instance's stored API key for a REST access token. */
export async function getRestAccessToken(row: InstanceRow): Promise<string> {
  return getRestAccessTokenWith({
    id: row.id,
    consoleUrl: row.consoleUrl,
    apiKey: readCredentials(row).apiKey,
  });
}

export function forgetRestAccessToken(instanceId: string): void {
  cache.delete(instanceId);
}
