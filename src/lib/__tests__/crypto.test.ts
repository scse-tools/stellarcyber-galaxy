import { decryptSecret, encryptSecret, generateMasterKey, getMasterKey } from "@/lib/crypto";
import { MissingEncryptionKeyError } from "@/lib/crypto";

const KEY = Buffer.from(generateMasterKey(), "base64");

describe("crypto", () => {
  it("round-trips a secret", () => {
    const secret = "s3cret-api-key-∆";
    expect(decryptSecret(encryptSecret(secret, KEY), KEY)).toBe(secret);
  });

  it("produces a fresh IV for every call", () => {
    expect(encryptSecret("same", KEY)).not.toBe(encryptSecret("same", KEY));
  });

  it("never leaves the plaintext in the envelope", () => {
    expect(encryptSecret("hunter2", KEY)).not.toContain("hunter2");
  });

  it("rejects a tampered ciphertext", () => {
    const envelope = encryptSecret("hunter2", KEY);
    const parts = envelope.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSecret(parts.join("."), KEY)).toThrow();
  });

  it("rejects a malformed envelope", () => {
    expect(() => decryptSecret("nope", KEY)).toThrow("Malformed secret envelope.");
  });

  it("fails loudly when the master key is missing or the wrong size", () => {
    expect(() => getMasterKey({} as unknown as NodeJS.ProcessEnv)).toThrow(MissingEncryptionKeyError);
    expect(() =>
      getMasterKey({ GALAXY_ENCRYPTION_KEY: "c2hvcnQ=" } as unknown as NodeJS.ProcessEnv),
    ).toThrow(/32 bytes/);
  });
});
