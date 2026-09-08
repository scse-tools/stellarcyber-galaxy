import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { certInfoFromPem, generateSelfSigned, validateCertKey, type CertInfo } from "@/lib/tls/core";

function tlsDir(): string {
  return process.env.GALAXY_TLS_DIR ?? join(process.cwd(), "data", "tls");
}
const certPath = () => join(tlsDir(), "cert.pem");
const keyPath = () => join(tlsDir(), "key.pem");

export function readCertInfo(): CertInfo {
  return certInfoFromPem(readFileSync(certPath(), "utf8"));
}

function persist(certPem: string, keyPem: string): void {
  mkdirSync(tlsDir(), { recursive: true });
  writeFileSync(certPath(), certPem, { mode: 0o600 });
  writeFileSync(keyPath(), keyPem, { mode: 0o600 });
  // The running HTTPS server (server.mjs) exposes this to hot-swap the cert without a restart.
  (globalThis as { __galaxyTlsReload?: () => void }).__galaxyTlsReload?.();
}

export function regenerateSelfSigned(): CertInfo {
  const { certPem, keyPem } = generateSelfSigned();
  persist(certPem, keyPem);
  return readCertInfo();
}

export function installCert(certPem: string, keyPem: string): CertInfo {
  validateCertKey(certPem, keyPem);
  persist(certPem.trim() + "\n", keyPem.trim() + "\n");
  return readCertInfo();
}
