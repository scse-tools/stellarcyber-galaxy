"use client";

import { cn } from "@/lib/utils";

const PILL_TONE = {
  good: "border-[var(--severity-success)]/40 bg-[var(--severity-success)]/10 text-[var(--severity-success)]",
  bad: "border-critical/40 bg-critical/10 text-critical",
  warn: "border-high/40 bg-high/10 text-high",
  info: "border-sc-link/40 bg-sc-link/10 text-sc-link",
  muted: "border-sc-border-soft bg-sc-raised/40 text-sc-muted",
} as const;

export type PillTone = keyof typeof PILL_TONE;

/** A small status chip used across the record detail modals. */
export function Pill({ label, tone }: { label: string; tone: PillTone }) {
  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", PILL_TONE[tone])}>
      {label}
    </span>
  );
}
