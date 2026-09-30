"use client";

import { useEffect, useState } from "react";
import { Microscope } from "lucide-react";
import { InvestigationCaseBand } from "@/components/investigation-case-band";
import { InvestigationCaseMeta } from "@/components/investigation-case-meta";
import { InvestigationAlertsTable } from "@/components/investigation-alerts-table";
import { InvestigationThreatIntel } from "@/components/investigation-threat-intel";
import { cn } from "@/lib/utils";
import type { CaseAlert, CaseDetail, CaseSummary, InstanceSummary } from "@/lib/types";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error ?? "Request failed.");
  return body as T;
}

export function InvestigationWorkspace({ instances }: { instances: InstanceSummary[]; isAdmin: boolean }) {
  const [instanceId, setInstanceId] = useState<string | null>(instances[0]?.id ?? null);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState<string | null>(null);

  const [caseId, setCaseId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [alerts, setAlerts] = useState<CaseAlert[]>([]);
  const [caseLoading, setCaseLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  // Load the selected tile's cases; reset the case selection when the tile changes.
  useEffect(() => {
    if (!instanceId) return;
    let cancelled = false;
    setCasesLoading(true);
    setCasesError(null);
    setCaseId(null);
    setDetail(null);
    setAlerts([]);
    getJson<{ cases: CaseSummary[] }>(`/api/instances/${instanceId}/cases`)
      .then((body) => {
        if (cancelled) return;
        setCases(body.cases);
      })
      .catch((error) => !cancelled && setCasesError(error instanceof Error ? error.message : "Load failed."))
      .finally(() => !cancelled && setCasesLoading(false));
    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  // Load the selected case's metadata and alerts in parallel.
  useEffect(() => {
    if (!instanceId || !caseId) return;
    let cancelled = false;
    setCaseLoading(true);
    setAlertsError(null);
    setDetail(null);
    setAlerts([]);
    const base = `/api/instances/${instanceId}/cases/${encodeURIComponent(caseId)}`;
    Promise.all([
      getJson<{ detail: CaseDetail }>(base).then((b) => !cancelled && setDetail(b.detail)),
      getJson<{ alerts: CaseAlert[] }>(`${base}/alerts`).then((b) => !cancelled && setAlerts(b.alerts)),
    ])
      .catch((error) => !cancelled && setAlertsError(error instanceof Error ? error.message : "Load failed."))
      .finally(() => !cancelled && setCaseLoading(false));
    return () => {
      cancelled = true;
    };
  }, [instanceId, caseId]);

  return (
    <section className="flex h-[calc(100vh-11rem)] min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <Microscope size={18} className="text-sc-accent" />
        <h2 className="text-lg font-semibold text-sc-text">Investigation Workspace</h2>
      </div>

      {/* Chips — one per tile on the case board. */}
      <div className="flex flex-wrap gap-1.5">
        {instances.map((instance) => (
          <button
            key={instance.id}
            type="button"
            onClick={() => setInstanceId(instance.id)}
            aria-pressed={instance.id === instanceId}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              instance.id === instanceId
                ? "border-sc-primary bg-sc-primary text-white"
                : "border-sc-border bg-sc-surface/70 text-sc-muted hover:bg-sc-active hover:text-sc-text",
            )}
          >
            {instance.name}
          </button>
        ))}
        {instances.length === 0 ? (
          <span className="text-xs text-sc-faint">Add an instance to begin investigating.</span>
        ) : null}
      </div>

      {/* Left cases band · middle case detail + alerts · right threat intel. */}
      <div className="grid min-h-0 flex-1 grid-cols-[16rem_minmax(0,1fr)_18rem] gap-3">
        <InvestigationCaseBand
          cases={cases}
          loading={casesLoading}
          error={casesError}
          selectedId={caseId}
          onSelect={setCaseId}
        />

        <div className="flex min-h-0 flex-col gap-3">
          {caseId ? (
            <>
              {detail ? (
                <InvestigationCaseMeta detail={detail} />
              ) : (
                <div className="rounded-xl border border-sc-border-soft bg-sc-surface/50 px-4 py-6 text-center text-xs text-sc-faint">
                  {caseLoading ? "Loading case…" : "Case metadata unavailable."}
                </div>
              )}
              <div className="min-h-0 flex-1">
                <InvestigationAlertsTable alerts={alerts} loading={caseLoading} error={alertsError} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-sc-border bg-sc-surface/40 px-4 text-center text-sm text-sc-faint">
              Select a case to view its metadata and alerts.
            </div>
          )}
        </div>

        <InvestigationThreatIntel />
      </div>
    </section>
  );
}
