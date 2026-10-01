"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { ObservableKind } from "@/lib/observables";
import type { TiSource } from "@/lib/investigation/types";

const KIND_LABEL: Record<ObservableKind, string> = {
  ip_public: "public IP",
  ip_private: "private IP",
  mac: "MAC",
  domain: "domain",
  hostname: "hostname",
  url: "URL",
  hash: "hash",
  email: "email",
  username: "username",
  filename: "file",
  registry: "registry",
  geo: "geo",
  reputation: "reputation",
};

const TIERS: { tier: TiSource["tier"]; label: string }[] = [
  { tier: "keyless", label: "Keyless — query automatically" },
  { tier: "premium", label: "Premium — needs an API key" },
  { tier: "custom", label: "Custom sources" },
];

function statusBadge(source: TiSource): { text: string; cls: string } {
  if (source.tier === "premium" && !source.hasKey) return { text: "needs key", cls: "bg-high/20 text-high" };
  if (!source.enabled) return { text: "disabled", cls: "bg-sc-active text-sc-faint" };
  return { text: source.hasKey ? "active · key" : "active", cls: "bg-[var(--severity-success)]/20 text-[var(--severity-success)]" };
}

/**
 * The actual threat-intel sources used for enrichment (fetched live), grouped by tier. Matches
 * exactly what runs during an investigation and what's configurable in settings.
 */
export function ThreatIntelSources() {
  const [sources, setSources] = useState<TiSource[]>([]);

  useEffect(() => {
    void fetch("/api/settings/ti-sources")
      .then((r) => r.json())
      .then((b) => setSources(b.sources ?? []))
      .catch(() => setSources([]));
  }, []);

  return (
    <div className="flex min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-1">
        {TIERS.map(({ tier, label }) => {
          const group = sources.filter((s) => s.tier === tier);
          if (group.length === 0) return null;
          return (
            <div key={tier}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-sc-faint">{label}</p>
              <ul className="space-y-1">
                {group.map((source) => {
                  const badge = statusBadge(source);
                  return (
                    <li
                      key={source.key}
                      className="flex items-start justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-sc-active"
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-medium text-sc-text">{source.name}</span>
                          <span className={`shrink-0 rounded px-1 text-[9px] font-semibold ${badge.cls}`}>{badge.text}</span>
                        </span>
                        <span className="block truncate text-[10px] text-sc-faint">
                          {source.kinds.map((k) => KIND_LABEL[k] ?? k).join(", ")}
                        </span>
                      </span>
                      {source.homepage ? (
                        <a
                          href={source.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-sc-faint hover:text-sc-link"
                          aria-label={`Open ${source.name}`}
                        >
                          <ExternalLink size={12} />
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {sources.length === 0 ? <p className="px-1 text-[11px] text-sc-faint">No sources configured.</p> : null}
      </div>

      <p className="mt-2 border-t border-sc-border-soft px-1 pt-2 text-[10px] leading-relaxed text-sc-faint">
        Keyless sources run automatically. Add API keys or custom sources under the settings gear.
      </p>
    </div>
  );
}
