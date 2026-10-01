"use client";

import { useState } from "react";
import {
  AtSign,
  Cpu,
  Fingerprint,
  FileText,
  Gauge,
  Globe,
  KeyRound,
  Link2,
  MapPin,
  Network,
  Router,
  Server,
  User,
  type LucideIcon,
} from "lucide-react";
import type { ObservableGroup, ObservableKind } from "@/lib/observables";

const ICONS: Record<ObservableKind, LucideIcon> = {
  ip_public: Network,
  ip_private: Router,
  mac: Cpu,
  domain: Globe,
  hostname: Server,
  username: User,
  email: AtSign,
  url: Link2,
  filename: FileText,
  hash: Fingerprint,
  registry: KeyRound,
  geo: MapPin,
  reputation: Gauge,
};

const INITIAL_LIMIT = 12;

/** Stable selection key for one observable. */
export const obsKey = (kind: ObservableKind, value: string) => `${kind}::${value}`;

interface Props {
  groups: ObservableGroup[];
  alertCount: number;
  selected: Set<string>;
  /** Observable keys to highlight (those belonging to the currently selected alert). */
  highlighted: Set<string>;
  onToggle: (kind: ObservableKind, value: string) => void;
  onToggleGroup: (kind: ObservableKind, values: string[], select: boolean) => void;
}

/** Pooled observables from every alert in the case; each filters the alert table and can be investigated. */
export function InvestigationObservables({ groups, alertCount, selected, highlighted, onToggle, onToggleGroup }: Props) {
  if (alertCount === 0 || groups.length === 0) return null;

  return (
    <section className="rounded-xl border border-sc-border-soft bg-sc-surface/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Fingerprint size={14} className="text-sc-accent" />
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-sc-faint">
          Observables <span className="text-sc-faint">· pooled from {alertCount} alerts</span>
        </h3>
        {selected.size > 0 ? (
          <span className="rounded-full bg-sc-primary px-2 py-0.5 text-[10px] font-medium text-white">
            {selected.size} selected · filtering alerts
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <ObservableGroupBlock
            key={group.kind}
            kind={group.kind}
            Icon={ICONS[group.kind]}
            label={group.label}
            observables={group.observables}
            selected={selected}
            highlighted={highlighted}
            onToggle={onToggle}
            onToggleGroup={onToggleGroup}
          />
        ))}
      </div>
    </section>
  );
}

function ObservableGroupBlock({
  kind,
  Icon,
  label,
  observables,
  selected,
  highlighted,
  onToggle,
  onToggleGroup,
}: {
  kind: ObservableKind;
  Icon: LucideIcon;
  label: string;
  observables: { value: string; count: number }[];
  selected: Set<string>;
  highlighted: Set<string>;
  onToggle: (kind: ObservableKind, value: string) => void;
  onToggleGroup: (kind: ObservableKind, values: string[], select: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? observables : observables.slice(0, INITIAL_LIMIT);
  const remaining = observables.length - shown.length;
  const values = observables.map((o) => o.value);
  const allSelected = values.every((v) => selected.has(obsKey(kind, v)));

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-sc-muted">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => onToggleGroup(kind, values, !allSelected)}
          className="accent-sc-primary"
          title={allSelected ? "Deselect all" : "Select all"}
        />
        <Icon size={12} className="shrink-0 text-sc-faint" />
        {label}
        <span className="text-sc-faint">({observables.length})</span>
      </div>
      <ul className="flex flex-wrap gap-1">
        {shown.map((o) => {
          const key = obsKey(kind, o.value);
          const isSelected = selected.has(key);
          const isHighlighted = highlighted.has(key);
          return (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => onToggle(kind, o.value)}
                aria-pressed={isSelected}
                className={`inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] transition-colors ${
                  isSelected
                    ? "border-sc-primary bg-sc-primary/15 text-sc-text"
                    : isHighlighted
                      ? "border-sc-accent bg-sc-accent/15 text-sc-text ring-1 ring-sc-accent"
                      : "border-sc-border-soft bg-sc-surface text-sc-text hover:border-sc-border"
                }`}
                title={`${o.value} · in ${o.count} alert${o.count === 1 ? "" : "s"}`}
              >
                <span className="truncate font-mono">{o.value}</span>
                {o.count > 1 ? (
                  <span className="shrink-0 rounded bg-sc-active px-1 text-[9px] tabular-nums text-sc-faint">
                    {o.count}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
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
