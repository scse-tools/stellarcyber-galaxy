import { proxiedFetch } from "@/lib/http";
import type { ObservableKind } from "@/lib/observables";

const TIMEOUT_MS = Number(process.env.GALAXY_TI_TIMEOUT_MS ?? 15_000);

export type Verdict = "malicious" | "suspicious" | "benign" | "info" | "unknown";

export interface SourceResult {
  verdict: Verdict;
  summary: string;
  raw: unknown;
}

async function getJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const response = await proxiedFetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
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

/** VirusTotal v3 — IPs, domains, URLs and file hashes. */
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
  return {
    verdict,
    summary: `${malicious} malicious / ${suspicious} suspicious / ${harmless} harmless detections`,
    raw: body.attributes ?? body,
  };
}

function getData(body: unknown): Record<string, unknown> {
  return rec(rec(body).data);
}

/** AbuseIPDB v2 — IP abuse confidence. */
async function abuseipdb(_kind: ObservableKind, value: string, apiKey: string): Promise<SourceResult> {
  const url = `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(value)}&maxAgeInDays=90`;
  const data = getData(await getJson(url, { Key: apiKey, Accept: "application/json" }));
  const score = Number(data.abuseConfidenceScore ?? 0);
  const verdict: Verdict = score >= 75 ? "malicious" : score >= 25 ? "suspicious" : "benign";
  return {
    verdict,
    summary: `Abuse confidence ${score}% · ${Number(data.totalReports ?? 0)} reports · ${String(data.countryCode ?? "?")}`,
    raw: data,
  };
}

/** GreyNoise community API — scanner/benign-noise classification. */
async function greynoise(_kind: ObservableKind, value: string, apiKey: string): Promise<SourceResult> {
  const body = rec(await getJson(`https://api.greynoise.io/v3/community/${encodeURIComponent(value)}`, { key: apiKey }));
  const classification = String(body.classification ?? "unknown");
  const verdict: Verdict = classification === "malicious" ? "malicious" : classification === "benign" ? "benign" : "info";
  return {
    verdict,
    summary: `${classification}${body.name ? ` · ${String(body.name)}` : ""}${body.riot ? " · RIOT" : ""}`,
    raw: body,
  };
}

/** Shodan host lookup — exposed ports and services. */
async function shodan(_kind: ObservableKind, value: string, apiKey: string): Promise<SourceResult> {
  const body = rec(await getJson(`https://api.shodan.io/shodan/host/${encodeURIComponent(value)}?key=${encodeURIComponent(apiKey)}`, {}));
  const ports = Array.isArray(body.ports) ? body.ports : [];
  return {
    verdict: "info",
    summary: `${ports.length} open port${ports.length === 1 ? "" : "s"}${body.org ? ` · ${String(body.org)}` : ""}${ports.length ? ` · ${ports.slice(0, 8).join(", ")}` : ""}`,
    raw: body,
  };
}

type Fetcher = (kind: ObservableKind, value: string, apiKey: string) => Promise<SourceResult>;

const FETCHERS: Record<string, Fetcher> = { virustotal, abuseipdb, greynoise, shodan };

/** Runs one live source lookup, returning a normalised result or an error result. */
export async function fetchFromSource(
  sourceKey: string,
  kind: ObservableKind,
  value: string,
  apiKey: string,
): Promise<SourceResult> {
  const fetcher = FETCHERS[sourceKey];
  if (!fetcher) return { verdict: "unknown", summary: "Source not supported.", raw: null };
  try {
    return await fetcher(kind, value, apiKey);
  } catch (error) {
    return { verdict: "unknown", summary: `Lookup failed: ${error instanceof Error ? error.message : "error"}`, raw: null };
  }
}
