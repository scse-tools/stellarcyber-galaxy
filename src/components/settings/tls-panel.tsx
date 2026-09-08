"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface CertInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  fingerprintSha256: string;
  selfSigned: boolean;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? "Request failed.");
  return body as T;
}

export function TlsPanel() {
  const [cert, setCert] = useState<CertInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [certPem, setCertPem] = useState("");
  const [keyPem, setKeyPem] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCert((await api<{ tls: CertInfo }>("/api/settings/tls")).tls);
      setError(null);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not read certificate.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(ok);
      await load();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md border border-critical/40 bg-critical/10 px-3 py-2 text-xs text-critical">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-md border border-sc-border-soft bg-sc-raised/60 px-3 py-2 text-xs text-sc-muted">
          {notice} The new certificate is applied to new TLS connections; reload the page to reconnect.
        </p>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-sc-faint">
          <Loader2 size={14} className="animate-spin" /> Reading certificate…
        </p>
      ) : cert ? (
        <dl className="space-y-2 rounded-lg border border-sc-border-soft bg-sc-raised/40 p-3 text-xs">
          <Row label="Subject" value={cert.subject} />
          <Row label="Issuer" value={cert.issuer} />
          <Row label="Valid" value={`${new Date(cert.validFrom).toLocaleString()} → ${new Date(cert.validTo).toLocaleString()}`} />
          <Row label="SHA-256" value={cert.fingerprintSha256} mono />
          <Row label="Type" value={cert.selfSigned ? "Self-signed" : "CA-issued / installed"} />
        </dl>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          onClick={() => void run(() => api("/api/settings/tls/regenerate", { method: "POST" }), "Generated a new self-signed certificate.")}
          disabled={busy}
        >
          <RefreshCw size={15} className={busy ? "animate-spin" : undefined} />
          Regenerate self-signed
        </Button>
      </div>

      <form
        className="space-y-3 rounded-lg border border-sc-border-soft p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            () => api("/api/settings/tls", { method: "POST", body: JSON.stringify({ cert: certPem, key: keyPem }) }),
            "Installed the provided certificate.",
          ).then(() => {
            setCertPem("");
            setKeyPem("");
          });
        }}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-sc-faint">
          <ShieldCheck size={13} /> Install a certificate
        </p>
        <Field label="Certificate (PEM)">
          <textarea
            className="h-24 w-full rounded-md border border-sc-border bg-sc-bg px-3 py-2 font-mono text-[11px] text-sc-text focus:border-sc-link focus:outline-none"
            placeholder="-----BEGIN CERTIFICATE-----"
            value={certPem}
            onChange={(e) => setCertPem(e.target.value)}
            required
          />
        </Field>
        <Field label="Private key (PEM)">
          <textarea
            className="h-24 w-full rounded-md border border-sc-border bg-sc-bg px-3 py-2 font-mono text-[11px] text-sc-text focus:border-sc-link focus:outline-none"
            placeholder="-----BEGIN PRIVATE KEY-----"
            value={keyPem}
            onChange={(e) => setKeyPem(e.target.value)}
            required
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={busy || !certPem || !keyPem}>
            Install certificate
          </Button>
        </div>
      </form>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-sc-faint">{label}</dt>
      <dd className={cn("min-w-0 break-all text-sc-text", mono && "font-mono text-[10px]")}>{value}</dd>
    </div>
  );
}
