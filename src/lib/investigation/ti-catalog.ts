import type { ObservableKind } from "@/lib/observables";

export type SourceTier = "keyless" | "premium";

export interface SourceDef {
  key: string;
  name: string;
  /** Observable kinds this source can enrich. */
  kinds: ObservableKind[];
  /** "keyless" sources run out of the box; "premium" sources need an API key. */
  tier: SourceTier;
  homepage: string;
  /** Where to get an API key (premium only). */
  keyUrl?: string;
}

// Built-in sources. Keyless ones run automatically with no configuration; premium ones
// activate once an API key is added. Users can also add their own custom premium sources.
export const SOURCE_CATALOG: SourceDef[] = [
  {
    key: "ipwhois",
    name: "IPWHOIS.io",
    kinds: ["ip_public"],
    tier: "keyless",
    homepage: "https://ipwhois.io",
  },
  {
    key: "rdap",
    name: "RDAP registry",
    kinds: ["ip_public", "domain"],
    tier: "keyless",
    homepage: "https://rdap.org",
  },
  {
    key: "dns",
    name: "DNS (Google DoH)",
    kinds: ["domain", "hostname"],
    tier: "keyless",
    homepage: "https://dns.google",
  },
  {
    key: "crtsh",
    name: "crt.sh (cert transparency)",
    kinds: ["domain"],
    tier: "keyless",
    homepage: "https://crt.sh",
  },
  {
    key: "internetdb",
    name: "Shodan InternetDB",
    kinds: ["ip_public"],
    tier: "keyless",
    homepage: "https://internetdb.shodan.io",
  },
  {
    key: "onionoo",
    name: "Tor (Onionoo)",
    kinds: ["ip_public"],
    tier: "keyless",
    homepage: "https://metrics.torproject.org/onionoo.html",
  },
  {
    key: "urlscan",
    name: "urlscan.io",
    kinds: ["domain", "ip_public", "url"],
    tier: "keyless",
    homepage: "https://urlscan.io",
  },
  {
    key: "virustotal",
    name: "VirusTotal",
    kinds: ["ip_public", "domain", "url", "hash"],
    tier: "premium",
    homepage: "https://www.virustotal.com",
    keyUrl: "https://www.virustotal.com/gui/my-apikey",
  },
  {
    key: "gti",
    name: "Google Threat Intelligence (GTI)",
    kinds: ["ip_public", "domain", "url", "hash"],
    tier: "premium",
    homepage: "https://gtidocs.virustotal.com",
    keyUrl: "https://www.virustotal.com/gui/my-apikey",
  },
  {
    key: "abuseipdb",
    name: "AbuseIPDB",
    kinds: ["ip_public"],
    tier: "premium",
    homepage: "https://www.abuseipdb.com",
    keyUrl: "https://www.abuseipdb.com/account/api",
  },
  {
    key: "greynoise",
    name: "GreyNoise",
    kinds: ["ip_public"],
    tier: "premium",
    homepage: "https://www.greynoise.io",
    keyUrl: "https://viz.greynoise.io/account/api-key",
  },
  {
    key: "shodan",
    name: "Shodan",
    kinds: ["ip_public"],
    tier: "premium",
    homepage: "https://www.shodan.io",
    keyUrl: "https://account.shodan.io",
  },
  {
    key: "otx",
    name: "AlienVault OTX",
    kinds: ["ip_public", "domain", "hostname", "url", "hash"],
    tier: "premium",
    homepage: "https://otx.alienvault.com",
    keyUrl: "https://otx.alienvault.com/api",
  },
  {
    key: "threatfox",
    name: "ThreatFox (abuse.ch)",
    kinds: ["ip_public", "domain", "url", "hash"],
    tier: "premium",
    homepage: "https://threatfox.abuse.ch",
    keyUrl: "https://auth.abuse.ch/",
  },
  {
    key: "urlhaus",
    name: "URLhaus (abuse.ch)",
    kinds: ["domain", "ip_public", "url"],
    tier: "premium",
    homepage: "https://urlhaus.abuse.ch",
    keyUrl: "https://auth.abuse.ch/",
  },
  {
    key: "malwarebazaar",
    name: "MalwareBazaar (abuse.ch)",
    kinds: ["hash"],
    tier: "premium",
    homepage: "https://bazaar.abuse.ch",
    keyUrl: "https://auth.abuse.ch/",
  },
];

export function findSource(key: string): SourceDef | undefined {
  return SOURCE_CATALOG.find((source) => source.key === key);
}

export function sourceName(key: string): string {
  return SOURCE_CATALOG.find((source) => source.key === key)?.name ?? key;
}
