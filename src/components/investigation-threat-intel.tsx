"use client";

import { ExternalLink, Globe } from "lucide-react";

interface Source {
  name: string;
  detail: string;
  url: string;
}

interface Group {
  label: string;
  sources: Source[];
}

// The major OSINT sources analysts pivot to first. Per-indicator deep links and custom
// sources come in the next step (source configuration).
const GROUPS: Group[] = [
  {
    label: "Reputation & enrichment",
    sources: [
      { name: "VirusTotal", detail: "Files, URLs, IPs, domains", url: "https://www.virustotal.com" },
      { name: "AbuseIPDB", detail: "IP abuse reports", url: "https://www.abuseipdb.com" },
      { name: "GreyNoise", detail: "Internet scan/benign noise", url: "https://viz.greynoise.io" },
      { name: "Cisco Talos", detail: "IP & domain reputation", url: "https://talosintelligence.com" },
      { name: "Spamhaus", detail: "IP/domain block lists", url: "https://check.spamhaus.org" },
    ],
  },
  {
    label: "Infrastructure & exposure",
    sources: [
      { name: "Shodan", detail: "Exposed hosts & services", url: "https://www.shodan.io" },
      { name: "Censys", detail: "Internet asset search", url: "https://search.censys.io" },
      { name: "IPinfo", detail: "Geo, ASN, hosting", url: "https://ipinfo.io" },
    ],
  },
  {
    label: "Malware & IOC feeds",
    sources: [
      { name: "AlienVault OTX", detail: "Community threat pulses", url: "https://otx.alienvault.com" },
      { name: "URLhaus", detail: "Malicious URLs (abuse.ch)", url: "https://urlhaus.abuse.ch" },
      { name: "ThreatFox", detail: "IOC sharing (abuse.ch)", url: "https://threatfox.abuse.ch" },
      { name: "MalwareBazaar", detail: "Malware samples (abuse.ch)", url: "https://bazaar.abuse.ch" },
    ],
  },
  {
    label: "Adversary knowledge",
    sources: [{ name: "MITRE ATT&CK", detail: "Techniques & tactics", url: "https://attack.mitre.org" }],
  },
];

/** Right-hand panel: the major OSINT sources for threat-intel investigation. */
export function InvestigationThreatIntel() {
  return (
    <aside className="flex min-h-0 flex-col rounded-xl border border-sc-border-soft bg-sc-surface/50">
      <div className="flex items-center gap-2 border-b border-sc-border-soft px-3 py-2">
        <Globe size={14} className="text-sc-accent" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-sc-faint">Threat Intel</span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-sc-faint">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.sources.map((source) => (
                <li key={source.name}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-sc-active"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-sc-text">{source.name}</span>
                      <span className="block truncate text-[10px] text-sc-faint">{source.detail}</span>
                    </span>
                    <ExternalLink size={12} className="shrink-0 text-sc-faint group-hover:text-sc-link" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="border-t border-sc-border-soft px-3 py-2 text-[10px] leading-relaxed text-sc-faint">
        Per-indicator deep links and custom sources are configurable in the next step.
      </p>
    </aside>
  );
}
