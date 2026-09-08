// Custom HTTPS server for Stellar Cyber Galaxy.
// Serves the Next.js app over TLS, generating a self-signed certificate on first run and
// hot-swapping it (via globalThis.__galaxyTlsReload) when an admin installs a new one.
import { createServer } from "node:https";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import next from "next";
import forge from "node-forge";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const tlsDir = process.env.GALAXY_TLS_DIR ?? join(process.cwd(), "data", "tls");
const certPath = join(tlsDir, "cert.pem");
const keyPath = join(tlsDir, "key.pem");

// Mirror of src/lib/tls/core.ts's generator, in plain JS so first boot needs no compiled code.
function generateSelfSigned(host = "localhost") {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01" + forge.util.bytesToHex(forge.random.getBytesSync(8));
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 825 * 24 * 60 * 60 * 1000);
  const attrs = [
    { name: "commonName", value: host },
    { name: "organizationName", value: "Stellar Cyber Galaxy" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: "basicConstraints", cA: false },
    { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
    { name: "extKeyUsage", serverAuth: true },
    {
      name: "subjectAltName",
      altNames: [
        { type: 2, value: host },
        { type: 2, value: "localhost" },
        { type: 7, ip: "127.0.0.1" },
      ],
    },
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return {
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(keys.privateKey),
  };
}

function ensureCert() {
  if (existsSync(certPath) && existsSync(keyPath)) return;
  mkdirSync(tlsDir, { recursive: true });
  const { certPem, keyPem } = generateSelfSigned();
  writeFileSync(certPath, certPem, { mode: 0o600 });
  writeFileSync(keyPath, keyPem, { mode: 0o600 });
  console.log(`[tls] generated self-signed certificate at ${certPath}`);
}

const readCreds = () => ({ cert: readFileSync(certPath), key: readFileSync(keyPath) });

ensureCert();

const app = next({ dev, hostname, port });
await app.prepare();
const handle = app.getRequestHandler();

const server = createServer(readCreds(), (req, res) => handle(req, res));

// Let the settings UI apply a new certificate to future connections without a restart.
globalThis.__galaxyTlsReload = () => {
  try {
    server.setSecureContext(readCreds());
    console.log("[tls] certificate reloaded");
  } catch (error) {
    console.error("[tls] certificate reload failed:", error);
  }
};

server.listen(port, hostname, () => {
  console.log(`Stellar Cyber Galaxy ready on https://${hostname}:${port} (dev=${dev})`);
});
