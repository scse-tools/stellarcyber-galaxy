"use client";

import { CheckCircle2, CircleSlash, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { McpTestResult, TestStepStatus } from "@/lib/types";

const ICONS: Record<TestStepStatus, typeof CheckCircle2> = {
  ok: CheckCircle2,
  fail: XCircle,
  skipped: CircleSlash,
};

const TONES: Record<TestStepStatus, string> = {
  ok: "text-[var(--severity-success)]",
  fail: "text-critical",
  skipped: "text-sc-faint",
};

interface McpTestPanelProps {
  running: boolean;
  result: McpTestResult | null;
  error: string | null;
}

export function McpTestPanel({ running, result, error }: McpTestPanelProps) {
  if (running) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-sc-border-soft bg-sc-raised/60 px-3 py-2 text-xs text-sc-muted">
        <Loader2 size={14} className="animate-spin" />
        Testing connect → get_access_token → listCases…
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-critical/40 bg-critical/10 px-3 py-2 text-xs text-critical">
        {error}
      </p>
    );
  }

  if (!result) return null;

  return (
    <div
      className={cn(
        "space-y-2 rounded-md border px-3 py-2.5",
        result.ok ? "border-sc-border-soft bg-sc-raised/60" : "border-critical/40 bg-critical/5",
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-sc-faint">
        {result.ok ? "Authentication succeeded" : "Authentication failed"}
        {result.transport ? ` · ${result.transport}` : ""}
      </p>
      <ol className="space-y-1.5">
        {result.steps.map((step) => {
          const Icon = ICONS[step.status];
          return (
            <li key={step.name} className="flex items-start gap-2 text-xs">
              <Icon size={14} className={cn("mt-0.5 shrink-0", TONES[step.status])} />
              <span className="min-w-0">
                <span className="text-sc-text">{step.name}</span>
                {step.status === "ok" && step.ms > 0 ? (
                  <span className="text-sc-faint"> · {step.ms}ms</span>
                ) : null}
                <span className="block break-words text-sc-faint">{step.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
