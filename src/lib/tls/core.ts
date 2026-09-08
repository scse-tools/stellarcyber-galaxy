import { X509Certificate, createPrivateKey } from "node:crypto";
import forge from "node-forge";

export interface CertInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  fingerprintSha256: string;
  selfSigned: boolean;
}

/** Generates a fresh 2048-bit self-signed certificate valid for ~27 months. */
export function generateSelfSigned(host = "localhost"): { certPem: string; keyPem: string } {
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

/** Reads certificate metadata for display. */
export function certInfoFromPem(certPem: string): CertInfo {
  const x509 = new X509Certificate(certPem);
  const clean = (value: string) => value.replace(/\n/g, ", ");
  return {
    subject: clean(x509.subject),
    issuer: clean(x509.issuer),
    validFrom: new Date(x509.validFrom).toISOString(),
    validTo: new Date(x509.validTo).toISOString(),
    fingerprintSha256: x509.fingerprint256,
    selfSigned: x509.subject === x509.issuer,
  };
}

/** Throws with a clear message when the cert/key are unparseable or do not match. */
export function validateCertKey(certPem: string, keyPem: string): void {
  let x509: X509Certificate;
  try {
    x509 = new X509Certificate(certPem);
  } catch {
    throw new Error("The certificate is not valid PEM.");
  }
  let key;
  try {
    key = createPrivateKey(keyPem);
  } catch {
    throw new Error("The private key is not valid PEM.");
  }
  if (!x509.checkPrivateKey(key)) {
    throw new Error("The private key does not match the certificate.");
  }
}
