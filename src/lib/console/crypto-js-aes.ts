import { createCipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Reproduces `CryptoJS.AES.encrypt(text, passphrase).toString()` — the exact transform the
 * Stellar Cyber console applies to a password before POSTing it. Output is the OpenSSL
 * "Salted__" envelope, base64-encoded, using EVP_BytesToKey (MD5) key derivation.
 */
export function cryptoJsAesEncrypt(plaintext: string, passphrase: string): string {
  const salt = randomBytes(8);
  const pass = Buffer.from(passphrase, "utf8");

  let derived = Buffer.alloc(0);
  let block = Buffer.alloc(0);
  while (derived.length < 48) {
    block = createHash("md5").update(Buffer.concat([block, pass, salt])).digest();
    derived = Buffer.concat([derived, block]);
  }
  const key = derived.subarray(0, 32);
  const iv = derived.subarray(32, 48);

  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
  return Buffer.concat([Buffer.from("Salted__", "utf8"), salt, ciphertext]).toString("base64");
}
