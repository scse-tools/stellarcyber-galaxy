import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// scrypt parameters — CPU/memory cost tuned for an interactive login on a self-hosted box.
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const SCHEME = "scrypt";

export const MIN_PASSWORD_LENGTH = 8;

/** Produces a salted scrypt hash string: `scrypt$N$r$p$salt$hash` (all base64). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEYLEN, { N, r: R, p: P });
  return [SCHEME, N, R, P, salt.toString("base64"), derived.toString("base64")].join("$");
}

/** Constant-time verification against a stored scrypt hash. */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== SCHEME) return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  let actual: Buffer;
  try {
    actual = scryptSync(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Returns a human message when a password is too weak, or null when acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}
