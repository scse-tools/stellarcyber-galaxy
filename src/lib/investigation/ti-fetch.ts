import { resolve4 } from "node:dns/promises";
import { proxiedFetch } from "@/lib/http";
import type { ObservableKind } from "@/lib/observables";

const TIMEOUT_MS = Number(process.env.GALAXY_TI_TIMEOUT_MS ?? 15_000);
// A browser-like UA: crt.sh and some RDAP servers reject the default Node/undici agent.
const USER_AGENT =
  "Mozilla/5.0 (compatible; StellarCyberGalaxy/1.0; +https://stellarcyber.ai) threat-intel-enrichment";

export type Verdict = "malicious" | "suspicious" | "benign" | "info" | "unknown";

export interface SourceResult {
  verdict: Verdict;
  summary: string;
  raw: unknown;
}

async function getJson(
  url: string,
  headers: Record<string, string>,
  method = "GET",
  timeoutMs = TIMEOUT_MS,
  body?: string,
): Promise<unknown> {
  const response = await proxiedFetch(url, {
    method,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...headers },
    redirect: "follow",
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}${typeof parsed === "string" ? `: ${parsed.slice(0, 120)}` : ""}`);
  }
  return parsed;
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
  const body = rec(await getJson(`https://rdap.org/${type}/${encodeURIComponent(value)}`, { Accept: "application/rdap+json" }, "GET", 25_000));
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
  // crt.sh is frequently slow; give it a longer budget.
  const body = await getJson(`https://crt.sh/?q=${encodeURIComponent(value)}&output=json`, {}, "GET", 30_000);
  const rows = Array.isArray(body) ? body : [];
  const issuers = [...new Set(rows.slice(0, 50).map((r) => String(rec(r).issuer_name ?? "")))].filter(Boolean);
  return {
    verdict: "info",
    summary: rows.length ? `${rows.length} certificates · ${issuers.slice(0, 2).join("; ")}` : "No certificates found",
    raw: rows.slice(0, 20),
  };
}

/** Shodan InternetDB — open ports, CVEs and hostnames for an IP, no key. */
async function internetdb(_kind: ObservableKind, value: string): Promise<SourceResult> {
  try {
    const body = rec(await getJson(`https://internetdb.shodan.io/${encodeURIComponent(value)}`, {}));
    const ports = Array.isArray(body.ports) ? body.ports : [];
    const vulns = Array.isArray(body.vulns) ? body.vulns : [];
    const hostnames = Array.isArray(body.hostnames) ? body.hostnames : [];
    return {
      verdict: vulns.length ? "suspicious" : "info",
      summary: `${ports.length} open port${ports.length === 1 ? "" : "s"}${vulns.length ? `, ${vulns.length} known CVEs` : ""}${hostnames.length ? ` · ${hostnames.slice(0, 2).join(", ")}` : ""}`,
      raw: body,
    };
  } catch (error) {
    if (error instanceof Error && /HTTP 404/.test(error.message)) {
      return { verdict: "benign", summary: "No exposed services or CVEs found", raw: null };
    }
    throw error;
  }
}

/** Tor network (Onionoo) — is the IP a known Tor relay/exit, no key. */
async function onionoo(_kind: ObservableKind, value: string): Promise<SourceResult> {
  const body = rec(await getJson(`https://onionoo.torproject.org/details?search=${encodeURIComponent(value)}&fields=nickname,exit_probability`, {}));
  const relays = Array.isArray(body.relays) ? body.relays : [];
  if (!relays.length) return { verdict: "info", summary: "Not a known Tor relay/exit", raw: body };
  const isExit = relays.some((relay) => Number(rec(relay).exit_probability) > 0);
  return { verdict: "suspicious", summary: `Known Tor ${isExit ? "exit node" : "relay"} (${relays.length} match${relays.length === 1 ? "" : "es"})`, raw: relays.slice(0, 5) };
}

/** urlscan.io — recent public scans referencing a domain/IP/URL, no key. */
async function urlscan(kind: ObservableKind, value: string): Promise<SourceResult> {
  const q = kind === "domain" ? `domain:${value}` : kind === "ip_public" ? `ip:${value}` : `page.url:"${value}"`;
  const body = rec(await getJson(`https://urlscan.io/api/v1/search/?q=${encodeURIComponent(q)}`, {}));
  const results = Array.isArray(body.results) ? body.results : [];
  const total = Number(body.total ?? results.length);
  return {
    verdict: "info",
    summary: total ? `${total} recent urlscan.io scan${total === 1 ? "" : "s"}` : "No recent scans",
    raw: results.slice(0, 3),
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

/** AlienVault OTX — community threat pulses for an indicator (free API key). */
async function otx(kind: ObservableKind, value: string, apiKey: string): Promise<SourceResult> {
  const seg =
    kind === "ip_public"
      ? `IPv4/${encodeURIComponent(value)}`
      : kind === "domain"
        ? `domain/${encodeURIComponent(value)}`
        : kind === "hostname"
          ? `hostname/${encodeURIComponent(value)}`
          : kind === "hash"
            ? `file/${encodeURIComponent(value)}`
            : `url/${encodeURIComponent(value)}`;
  const body = rec(await getJson(`https://otx.alienvault.com/api/v1/indicators/${seg}/general`, { "X-OTX-API-KEY": apiKey }));
  const pulse = rec(body.pulse_info);
  const pulses = Array.isArray(pulse.pulses) ? pulse.pulses : [];
  const count = Number(pulse.count ?? pulses.length);
  const first = pulses[0] ? String(rec(pulses[0]).name ?? "") : "";
  return {
    verdict: count > 0 ? "suspicious" : "benign",
    summary: count ? `${count} threat pulse${count === 1 ? "" : "s"}${first ? ` · ${first}` : ""}` : "No threat pulses",
    raw: pulse,
  };
}

/** abuse.ch ThreatFox — IOC matches (free Auth-Key). */
async function threatfox(_kind: ObservableKind, value: string, apiKey: string): Promise<SourceResult> {
  const body = rec(
    await getJson(
      "https://threatfox-api.abuse.ch/api/v1/",
      { "Auth-Key": apiKey, "Content-Type": "application/json" },
      "POST",
      TIMEOUT_MS,
      JSON.stringify({ query: "search_ioc", search_term: value }),
    ),
  );
  const data = Array.isArray(body.data) ? body.data : [];
  if (body.query_status !== "ok" || data.length === 0) return { verdict: "benign", summary: "No ThreatFox IOC matches", raw: body };
  const first = rec(data[0]);
  return {
    verdict: "malicious",
    summary: `${data.length} IOC match${data.length === 1 ? "" : "es"}${first.malware_printable ? ` · ${String(first.malware_printable)}` : ""}`,
    raw: data.slice(0, 5),
  };
}

/** abuse.ch URLhaus — malicious URL/host listings (free Auth-Key). */
async function urlhaus(kind: ObservableKind, value: string, apiKey: string): Promise<SourceResult> {
  const isUrl = kind === "url";
  const form = isUrl ? `url=${encodeURIComponent(value)}` : `host=${encodeURIComponent(value)}`;
  const body = rec(
    await getJson(
      `https://urlhaus-api.abuse.ch/v1/${isUrl ? "url" : "host"}/`,
      { "Auth-Key": apiKey, "Content-Type": "application/x-www-form-urlencoded" },
      "POST",
      TIMEOUT_MS,
      form,
    ),
  );
  if (body.query_status !== "ok") return { verdict: "benign", summary: "Not listed on URLhaus", raw: body };
  const urls = Array.isArray(body.urls) ? body.urls : [];
  const count = isUrl ? 1 : urls.length;
  return { verdict: "malicious", summary: `Listed on URLhaus${count ? ` · ${count} URL${count === 1 ? "" : "s"}` : ""}`, raw: body };
}

/** abuse.ch MalwareBazaar — known malware sample lookup by hash (free Auth-Key). */
async function malwarebazaar(_kind: ObservableKind, value: string, apiKey: string): Promise<SourceResult> {
  const body = rec(
    await getJson(
      "https://mb-api.abuse.ch/api/v1/",
      { "Auth-Key": apiKey, "Content-Type": "application/x-www-form-urlencoded" },
      "POST",
      TIMEOUT_MS,
      `query=get_info&hash=${encodeURIComponent(value)}`,
    ),
  );
  if (body.query_status !== "ok") return { verdict: "benign", summary: "Not found in MalwareBazaar", raw: body };
  const data = Array.isArray(body.data) ? body.data : [];
  const first = rec(data[0]);
  return {
    verdict: "malicious",
    summary: `Known sample${first.signature ? ` · ${String(first.signature)}` : ""}${first.file_type ? ` (${String(first.file_type)})` : ""}`,
    raw: data.slice(0, 3),
  };
}

type KeylessFetcher = (kind: ObservableKind, value: string) => Promise<SourceResult>;
type KeyedFetcher = (kind: ObservableKind, value: string, apiKey: string) => Promise<SourceResult>;

const KEYLESS: Record<string, KeylessFetcher> = { ipwhois, rdap, dns, crtsh, internetdb, onionoo, urlscan };
const KEYED: Record<string, KeyedFetcher> = { virustotal, abuseipdb, greynoise, shodan, otx, threatfox, urlhaus, malwarebazaar };

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
