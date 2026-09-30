import { resolve4 } from "node:dns/promises";
import { proxiedFetch } from "@/lib/http";
import type { ObservableKind } from "@/lib/observables";

const TIMEOUT_MS = Number(process.env.GALAXY_TI_TIMEOUT_MS ?? 15_000);

export type Verdict = "malicious" | "suspicious" | "benign" | "info" | "unknown";

export interface SourceResult {
  verdict: Verdict;
  summary: string;
  raw: unknown;
}

async function getJson(url: string, headers: Record<string, string>, method = "GET"): Promise<unknown> {
  const response = await proxiedFetch(url, { method, headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}${typeof body === "string" ? `: ${body.slice(0, 120)}` : ""}`);
  }
  return body;
}

const rec = (value: unknown): Record<string, unknown> => (typeof value === "object" && value ? (value as Record<string, unknown>) : {});
const getData = (body: unknown): Record<string, unknown> => rec(rec(body).data);

/* ------------------------------- keyless sources ------------------------------- */

/** IPWHOIS.io (ipwho.is) — free IP geolocation and ASN, no key. */
async function ipwhois(_kind: ObservableKind, value: string): Promise<SourceResult> {
  const body = rec(await getJson(`https://ipwho.is/${encodeURIComponent(value)}`, {}));
  if (body.success === false) return { verdict: "unknown", summary: String(body.message ?? "No data"), raw: body };
  const connection = rec(body.connection);
  return {
    verdict: "info",
    summary: `${[body.city, body.country].filter(Boolean).join(", ")} · ${String(connection.org || connection.isp || "?")} (AS${String(connection.asn ?? "?")})`,
    raw: body,
  };
}

/** RDAP — registration data for IPs and domains, no key. */
async function rdap(kind: ObservableKind, value: string): Promise<SourceResult> {
  const type = kind === "domain" ? "domain" : "ip";
  const body = rec(await getJson(`https://rdap.org/${type}/${encodeURIComponent(value)}`, { Accept: "application/rdap+json" }));
  const name = String(body.name || body.handle || body.ldhName || "?");
  const registrar = Array.isArray(body.entities)
    ? (body.entities as unknown[]).map((e) => rec(e)).find((e) => Array.isArray(e.roles) && (e.roles as string[]).includes("registrar"))
    : undefined;
  const registrarName = registrar ? String(registrar.handle ?? "") : "";
  return {
    verdict: "info",
    summary: [name, String(body.country ?? ""), registrarName].filter(Boolean).join(" · "),
    raw: body,
  };
}

/**
 * Resolve a domain/hostname to A records. Tries Google DNS-over-HTTPS first; if that HTTP call is
 * blocked or fails, falls back to the host's own system resolver (works in restricted egress).
 */
async function dns(_kind: ObservableKind, value: string): Promise<SourceResult> {
  try {
    const body = rec(await getJson(`https://dns.google/resolve?name=${encodeURIComponent(value)}&type=A`, {}));
    const answers = Array.isArray(body.Answer) ? (body.Answer as unknown[]).map((a) => String(rec(a).data)) : [];
    if (Number(body.Status) === 3) return { verdict: "info", summary: "No A record (NXDOMAIN)", raw: body };
    return { verdict: "info", summary: answers.length ? `Resolves to ${answers.join(", ")} (DoH)` : "No A records", raw: body };
  } catch (dohError) {
    // Fall back to the system resolver (UDP/53) when DoH over HTTPS isn't reachable.
    const addresses = await resolve4(value).catch(() => {
      throw dohError; // surface the original DoH failure if the system resolver also can't help
    });
    return {
      verdict: "info",
      summary: addresses.length ? `Resolves to ${addresses.join(", ")} (system resolver)` : "No A records",
      raw: { A: addresses, resolver: "system" },
    };
  }
}

/** crt.sh — certificate transparency logs for a domain, no key. */
async function crtsh(_kind: ObservableKind, value: string): Promise<SourceResult> {
  const body = await getJson(`https://crt.sh/?q=${encodeURIComponent(value)}&output=json`, {});
  const rows = Array.isArray(body) ? body : [];
  const issuers = [...new Set(rows.slice(0, 50).map((r) => String(rec(r).issuer_name ?? "")))].filter(Boolean);
  return {
    verdict: "info",
    summary: rows.length ? `${rows.length} certificates · ${issuers.slice(0, 2).join("; ")}` : "No certificates found",
    raw: rows.slice(0, 20),
  };
}

/* ------------------------------- premium sources ------------------------------- */

async function virustotal(kind: ObservableKind, value: string, apiKey: string): Promise<SourceResult> {
  const base = "https://www.virustotal.com/api/v3";
  const path =
    kind === "ip_public"
      ? `ip_addresses/${encodeURIComponent(value)}`
      : kind === "domain"
        ? `domains/${encodeURIComponent(value)}`
        : kind === "hash"
          ? `files/${encodeURIComponent(value)}`
          : `urls/${Buffer.from(value).toString("base64url")}`;
  const body = getData(await getJson(`${base}/${path}`, { "x-apikey": apiKey }));
  const stats = rec(rec(body.attributes).last_analysis_stats);
  const malicious = Number(stats.malicious ?? 0);
  const suspicious = Number(stats.suspicious ?? 0);
  const harmless = Number(stats.harmless ?? 0);
  const verdict: Verdict = malicious > 0 ? "malicious" : suspicious > 0 ? "suspicious" : harmless > 0 ? "benign" : "unknown";
  return { verdict, summary: `${malicious} malicious / ${suspicious} suspicious / ${harmless} harmless`, raw: body.attributes ?? body };
}

async function abuseipdb(_kind: ObservableKind, value: string, apiKey: string): Promise<SourceResult> {
  const url = `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(value)}&maxAgeInDays=90`;
  const data = getData(await getJson(url, { Key: apiKey, Accept: "application/json" }));
  const score = Number(data.abuseConfidenceScore ?? 0);
  const verdict: Verdict = score >= 75 ? "malicious" : score >= 25 ? "suspicious" : "benign";
  return { verdict, summary: `Abuse confidence ${score}% · ${Number(data.totalReports ?? 0)} reports · ${String(data.countryCode ?? "?")}`, raw: data };
}

async function greynoise(_kind: ObservableKind, value: string, apiKey: string): Promise<SourceResult> {
  const body = rec(await getJson(`https://api.greynoise.io/v3/community/${encodeURIComponent(value)}`, { key: apiKey }));
  const classification = String(body.classification ?? "unknown");
  const verdict: Verdict = classification === "malicious" ? "malicious" : classification === "benign" ? "benign" : "info";
  return { verdict, summary: `${classification}${body.name ? ` · ${String(body.name)}` : ""}${body.riot ? " · RIOT" : ""}`, raw: body };
}

async function shodan(_kind: ObservableKind, value: string, apiKey: string): Promise<SourceResult> {
  const body = rec(await getJson(`https://api.shodan.io/shodan/host/${encodeURIComponent(value)}?key=${encodeURIComponent(apiKey)}`, {}));
  const ports = Array.isArray(body.ports) ? body.ports : [];
  return { verdict: "info", summary: `${ports.length} open port${ports.length === 1 ? "" : "s"}${body.org ? ` · ${String(body.org)}` : ""}${ports.length ? ` · ${ports.slice(0, 8).join(", ")}` : ""}`, raw: body };
}

type KeylessFetcher = (kind: ObservableKind, value: string) => Promise<SourceResult>;
type KeyedFetcher = (kind: ObservableKind, value: string, apiKey: string) => Promise<SourceResult>;

const KEYLESS: Record<string, KeylessFetcher> = { ipwhois, rdap, dns, crtsh };
const KEYED: Record<string, KeyedFetcher> = { virustotal, abuseipdb, greynoise, shodan };

/** A user-defined source: an HTTP template with `{value}` and an optional auth header for the key. */
export interface CustomSourceConfig {
  urlTemplate: string;
  authHeader?: string | null;
  method?: string;
}

async function fetchCustom(config: CustomSourceConfig, value: string, apiKey: string | null): Promise<SourceResult> {
  const url = config.urlTemplate.replaceAll("{value}", encodeURIComponent(value));
  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.authHeader && apiKey) headers[config.authHeader] = apiKey;
  const body = await getJson(url, headers, config.method || "GET");
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return { verdict: "info", summary: text.slice(0, 200), raw: body };
}

/** Runs one source lookup (built-in keyless/keyed or custom), always resolving to a result. */
export async function fetchFromSource(
  sourceKey: string,
  kind: ObservableKind,
  value: string,
  apiKey: string | null,
  custom?: CustomSourceConfig,
): Promise<SourceResult> {
  try {
    if (custom) return await fetchCustom(custom, value, apiKey);
    if (KEYLESS[sourceKey]) return await KEYLESS[sourceKey](kind, value);
    if (KEYED[sourceKey]) return await KEYED[sourceKey](kind, value, apiKey ?? "");
    return { verdict: "unknown", summary: "Source not supported.", raw: null };
  } catch (error) {
    return { verdict: "unknown", summary: `Lookup failed: ${error instanceof Error ? error.message : "error"}`, raw: null };
  }
}
