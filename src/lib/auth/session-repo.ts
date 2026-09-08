import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { getUserById } from "@/lib/auth/user-repo";
import type { SessionUser } from "@/lib/auth/types";

const SESSION_TTL_MS = Number(process.env.GALAXY_SESSION_TTL_MS ?? 12 * 60 * 60 * 1000);

// Only a hash of the token is stored, so a database leak cannot resurrect live sessions.
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export interface NewSession {
  token: string;
  expiresAt: Date;
}

export function createSession(userId: string): NewSession {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  getDb()
    .prepare(
      "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    )
    .run(hashToken(token), userId, expiresAt.toISOString(), new Date().toISOString());
  return { token, expiresAt };
}

/** Resolves a raw cookie token to its user, deleting the row if it has expired. */
export function resolveSession(token: string): SessionUser | null {
  const db = getDb();
  const row = db
    .prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?")
    .get(hashToken(token)) as unknown as { user_id: string; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    return null;
  }
  const user = getUserById(row.user_id);
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

export function deleteSession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

/** Invalidates every session for a user — used after a password change or account removal. */
export function deleteUserSessions(userId: string): void {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}
