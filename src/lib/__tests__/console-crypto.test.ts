import { createDecipheriv, createHash } from "node:crypto";
import { cryptoJsAesEncrypt } from "@/lib/console/crypto-js-aes";

/** Independent OpenSSL-style decrypt, to prove the envelope is the real CryptoJS format. */
function opensslDecrypt(b64: string, passphrase: string): string {
  const raw = Buffer.from(b64, "base64");
  if (raw.subarray(0, 8).toString() !== "Salted__") throw new Error("no salt header");
  const salt = raw.subarray(8, 16);
  const body = raw.subarray(16);
  const pass = Buffer.from(passphrase, "utf8");
  let derived = Buffer.alloc(0);
  let block = Buffer.alloc(0);
  while (derived.length < 48) {
    block = createHash("md5").update(Buffer.concat([block, pass, salt])).digest();
    derived = Buffer.concat([derived, block]);
  }
  const decipher = createDecipheriv("aes-256-cbc", derived.subarray(0, 32), derived.subarray(32, 48));
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

describe("cryptoJsAesEncrypt", () => {
  it("produces the OpenSSL Salted__ envelope CryptoJS emits", () => {
    const enc = cryptoJsAesEncrypt("hunter2", "735d33f9");
    expect(Buffer.from(enc, "base64").subarray(0, 8).toString()).toBe("Salted__");
  });

  it("round-trips a password back to plaintext", () => {
    const secret = "P@ssw0rd-∆-123";
    expect(opensslDecrypt(cryptoJsAesEncrypt(secret, "735d33f9"), "735d33f9")).toBe(secret);
  });

  it("uses a fresh salt every call", () => {
    expect(cryptoJsAesEncrypt("same", "735d33f9")).not.toBe(cryptoJsAesEncrypt("same", "735d33f9"));
  });
});
