import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const ENVELOPE_VERSION = "v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;
const AAD = Buffer.from("stellar-cyber-galaxy");

export class MissingEncryptionKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingEncryptionKeyError";
  }
}

/** Reads the 32-byte master key from the environment. Never cached, never logged. */
export function getMasterKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const raw = env.GALAXY_ENCRYPTION_KEY;
  if (!raw) {
    throw new MissingEncryptionKeyError(
      "GALAXY_ENCRYPTION_KEY is not set. Run `npm run keygen` and add the value to .env.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new MissingEncryptionKeyError(
      `GALAXY_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}.`,
    );
  }
  return key;
}

/** Encrypts a secret into a self-describing `v1.iv.tag.ciphertext` envelope. */
export function encryptSecret(plaintext: string, key: Buffer = getMasterKey()): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    ENVELOPE_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

/** Decrypts an envelope produced by {@link encryptSecret}. Throws if it was tampered with. */
export function decryptSecret(envelope: string, key: Buffer = getMasterKey()): string {
  const [version, iv, tag, ciphertext] = envelope.split(".");
  if (version !== ENVELOPE_VERSION || !iv || !tag || !ciphertext) {
    throw new Error("Malformed secret envelope.");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64url"));
  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** True when two secrets match, without leaking length-independent timing. */
export function secretsMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function generateMasterKey(): string {
  return randomBytes(KEY_BYTES).toString("base64");
}
