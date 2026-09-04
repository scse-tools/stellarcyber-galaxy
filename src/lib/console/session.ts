import { cryptoJsAesEncrypt } from "@/lib/console/crypto-js-aes";
import { discoverBuildHash } from "@/lib/console/build-hash";
import { proxiedFetch } from "@/lib/console/fetch";
import { readCredentials } from "@/lib/instance-repo";
import type { InstanceRow } from "@/lib/types";

const LOGIN_PATH = "/local/login/callback";
const AUTH_CHECK_PATH = "/auth/is_authenticated";
const SESSION_COOKIE_HINTS = ["connect.sid", "session", "sid", "aella"];

export interface ConsoleLoginFields {
  name: string;
  email: string;
  password: string;
  buildHash: string;
}

export interface ConsoleLoginResult {
  /** Absolute URL the browser form should POST to. */
  action: string;
  /** Console root to land on once the session cookie is set. */
  consoleUrl: string;
  /** Pre-encoded fields for the browser's top-level auto-submit form. */
  fields: ConsoleLoginFields;
  /** Names of the cookies the console set, for the session-health display. */
  cookieNames: string[];
}

interface ServerSession {
  cookies: string; // Cookie header value the server replays on keepalive.
  establishedAt: number;
  lastCheckedAt: number;
}

// The server keeps its own cookie jar per instance so it can send keepalives on the refresh cycle.
const globalForSessions = globalThis as typeof globalThis & {
  galaxyConsoleSessions?: Map<string, ServerSession>;
};
const sessions = (globalForSessions.galaxyConsoleSessions ??= new Map<string, ServerSession>());

function jarFrom(setCookies: string[]): string {
  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

function looksLikeSession(setCookies: string[]): boolean {
  return setCookies.some((cookie) =>
    SESSION_COOKIE_HINTS.some((hint) => cookie.toLowerCase().includes(hint)),
  );
}

/**
 * Logs the instance's stored credentials into its console, server-side. Establishes a server
 * session (for keepalive) and returns the fields the browser needs to auto-submit its own login.
 */
export async function establishConsoleSession(row: InstanceRow): Promise<ConsoleLoginResult> {
  const origin = new URL(row.consoleUrl).origin;
  const { username, password } = readCredentials(row);
  const buildHash = row.consoleBuildHash || (await discoverBuildHash(row.consoleUrl));

  const fields: ConsoleLoginFields = {
    name: username,
    email: username,
    password: cryptoJsAesEncrypt(password, buildHash),
    buildHash,
  };

  const response = await proxiedFetch(`${origin}${LOGIN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(fields),
    redirect: "manual",
  });

  if (response.status >= 400) {
    const body = await response.text().catch(() => "");
    throw new Error(consoleError(response.status, body));
  }

  const setCookies = response.headers.getSetCookie?.() ?? [];
  if (!looksLikeSession(setCookies)) {
    throw new Error("Console login returned no session cookie; credentials may be wrong.");
  }

  sessions.set(row.id, {
    cookies: jarFrom(setCookies),
    establishedAt: Date.now(),
    lastCheckedAt: Date.now(),
  });

  return {
    action: `${origin}${LOGIN_PATH}`,
    consoleUrl: row.consoleUrl,
    fields,
    cookieNames: setCookies.map((cookie) => cookie.split("=")[0]),
  };
}

export interface KeepaliveResult {
  ok: boolean;
  establishedAt: number | null;
  checkedAt: number;
}

/** Pings the console with the server's stored cookie jar to keep the session warm. */
export async function keepaliveConsoleSession(row: InstanceRow): Promise<KeepaliveResult> {
  const origin = new URL(row.consoleUrl).origin;
  const session = sessions.get(row.id);
  if (!session) return { ok: false, establishedAt: null, checkedAt: Date.now() };

  try {
    const response = await proxiedFetch(`${origin}${AUTH_CHECK_PATH}`, {
      headers: { Accept: "application/json", Cookie: session.cookies },
    });
    const payload = (await response.json().catch(() => ({}))) as { isAuthenticated?: boolean };
    const ok = response.ok && payload.isAuthenticated === true;
    if (ok) {
      session.lastCheckedAt = Date.now();
      return { ok: true, establishedAt: session.establishedAt, checkedAt: session.lastCheckedAt };
    }
  } catch {
    /* fall through to eviction */
  }
  sessions.delete(row.id);
  return { ok: false, establishedAt: null, checkedAt: Date.now() };
}

export function forgetConsoleSession(instanceId: string): void {
  sessions.delete(instanceId);
}

function consoleError(status: number, body: string): string {
  if (status === 401) return "Console rejected the credentials (401). Check the username/password.";
  if (status === 423 || /lockout/i.test(body)) {
    return "The console account is locked out from too many attempts. Wait, then retry.";
  }
  return `Console login failed (HTTP ${status}).`;
}
