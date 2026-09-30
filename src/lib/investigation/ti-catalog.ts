import type { ObservableKind } from "@/lib/observables";

export interface SourceDef {
  key: string;
  name: string;
  /** Observable kinds this source can enrich. */
  kinds: ObservableKind[];
  homepage: string;
  /** Where to sign up for an API key. */
  keyUrl: string;
}

// Sources we can call live when an API key is configured. The AI agent covers everything else.
export const SOURCE_CATALOG: SourceDef[] = [
  {
    key: "virustotal",
    name: "VirusTotal",
    kinds: ["ip_public", "domain", "url", "hash"],
    homepage: "https://www.virustotal.com",
    keyUrl: "https://www.virustotal.com/gui/my-apikey",
  },
  {
    key: "abuseipdb",
    name: "AbuseIPDB",
    kinds: ["ip_public"],
    homepage: "https://www.abuseipdb.com",
    keyUrl: "https://www.abuseipdb.com/account/api",
  },
  {
    key: "greynoise",
    name: "GreyNoise",
    kinds: ["ip_public"],
    homepage: "https://www.greynoise.io",
    keyUrl: "https://viz.greynoise.io/account/api-key",
  },
  {
    key: "shodan",
    name: "Shodan",
    kinds: ["ip_public"],
    homepage: "https://www.shodan.io",
    keyUrl: "https://account.shodan.io",
  },
];

export function sourcesForKind(kind: ObservableKind): SourceDef[] {
  return SOURCE_CATALOG.filter((source) => source.kinds.includes(kind));
}

export function sourceName(key: string): string {
  return SOURCE_CATALOG.find((source) => source.key === key)?.name ?? key;
}
