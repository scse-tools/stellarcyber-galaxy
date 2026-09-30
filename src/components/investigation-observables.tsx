"use client";

import { useMemo, useState } from "react";
import {
  AtSign,
  Fingerprint,
  FileText,
  Globe,
  Link2,
  Network,
  Router,
  Server,
  User,
  type LucideIcon,
} from "lucide-react";
import { extractObservables, type ObservableKind } from "@/lib/observables";
import type { CaseAlert } from "@/lib/types";

const ICONS: Record<ObservableKind, LucideIcon> = {
  ip_public: Network,
  ip_private: Router,
  domain: Globe,
  hostname: Server,
  username: User,
  email: AtSign,
  url: Link2,
  filename: FileText,
  hash: Fingerprint,
};

const INITIAL_LIMIT = 12;

/** Pooled observables extracted from every alert in the selected case. */
export function InvestigationObservables({ alerts }: { alerts: CaseAlert[] }) {
  const groups = useMemo(() => extractObservables(alerts), [alerts]);

  if (alerts.length === 0 || groups.length === 0) return null;

  return (
    <section className="rounded-xl border border-sc-border-soft bg-sc-surface/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Fingerprint size={14} className="text-sc-accent" />
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-sc-faint">
          Observables <span className="text-sc-faint">· pooled from {alerts.length} alerts</span>
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <ObservableGroupBlock
            key={group.kind}
            Icon={ICONS[group.kind]}
            label={group.label}
            observables={group.observables}
          />
        ))}
      </div>
    </section>
  );
}

function ObservableGroupBlock({
  Icon,
  label,
  observables,
}: {
  Icon: LucideIcon;
  label: string;
  observables: { value: string; count: number }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? observables : observables.slice(0, INITIAL_LIMIT);
  const remaining = observables.length - shown.length;

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-sc-muted">
        <Icon size={12} className="shrink-0 text-sc-faint" />
        {label}
        <span className="text-sc-faint">({observables.length})</span>
      </div>
      <ul className="flex flex-wrap gap-1">
        {shown.map((o) => (
          <li key={o.value}>
            <span
              className="inline-flex max-w-full items-center gap-1 rounded border border-sc-border-soft bg-sc-surface px-1.5 py-0.5 text-[11px] text-sc-text"
              title={`${o.value} · in ${o.count} alert${o.count === 1 ? "" : "s"}`}
            >
              <span className="truncate font-mono">{o.value}</span>
              {o.count > 1 ? (
                <span className="shrink-0 rounded bg-sc-active px-1 text-[9px] tabular-nums text-sc-faint">
                  {o.count}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {remaining > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 text-[10px] text-sc-link hover:underline"
        >
          +{remaining} more
        </button>
      ) : null}
    </div>
  );
}
