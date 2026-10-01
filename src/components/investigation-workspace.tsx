"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Microscope, RefreshCw } from "lucide-react";
import { InvestigationCaseBand } from "@/components/investigation-case-band";
import { InvestigationCaseMeta } from "@/components/investigation-case-meta";
import { InvestigationObservables, obsKey } from "@/components/investigation-observables";
import { InvestigationAlertsTable } from "@/components/investigation-alerts-table";
import { InvestigationPanel } from "@/components/investigation-panel";
import { TimeRangePicker } from "@/components/time-range-picker";
import { Button } from "@/components/ui/button";
import { DEFAULT_SELECTION, describeRange, resolveTimeRange, type TimeRangeSelection } from "@/lib/time-range";
import { cn } from "@/lib/utils";
import { buildObservableIndex, type ObservableKind } from "@/lib/observables";
import { extractTtps } from "@/lib/mitre";
import { buildCaseContext } from "@/lib/investigation/context";
import type { Observable } from "@/lib/investigation/types";
import type { CaseAlert, CaseDetail, CaseSummary, InstanceSummary } from "@/lib/types";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error ?? "Request failed.");
  return body as T;
}

export function InvestigationWorkspace({ instances, isAdmin }: { instances: InstanceSummary[]; isAdmin: boolean }) {
  const [instanceId, setInstanceId] = useState<string | null>(instances[0]?.id ?? null);
  const [range, setRange] = useState<TimeRangeSelection>(DEFAULT_SELECTION);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState<string | null>(null);
  const [investigatedIds, setInvestigatedIds] = useState<Set<string>>(new Set());

  const [caseId, setCaseId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [alerts, setAlerts] = useState<CaseAlert[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);

  const refreshInvestigated = useCallback(async () => {
    if (!instanceId) return;
    try {
      const body = await getJson<{ caseIds: string[] }>(`/api/instances/${instanceId}/investigations`);
      setInvestigatedIds(new Set(body.caseIds));
    } catch {
      /* non-fatal — insignia simply won't show */
    }
  }, [instanceId]);

  const loadCases = useCallback(async () => {
    if (!instanceId) return;
    setCasesLoading(true);
    setCasesError(null);
    try {
      const body = await getJson<{ cases: CaseSummary[] }>(`/api/instances/${instanceId}/cases`);
      setCases(body.cases);
    } catch (error) {
      setCasesError(error instanceof Error ? error.message : "Load failed.");
    } finally {
      setCasesLoading(false);
    }
  }, [instanceId]);

  const loadCase = useCallback(async () => {
    if (!instanceId || !caseId) return;
    setCaseLoading(true);
    setAlertsError(null);
    const base = `/api/instances/${instanceId}/cases/${encodeURIComponent(caseId)}`;
    try {
      const [d, a] = await Promise.all([
        getJson<{ detail: CaseDetail; aiSummary?: string | null }>(base),
        getJson<{ alerts: CaseAlert[] }>(`${base}/alerts`),
      ]);
      setDetail(d.detail);
      setAiSummary(d.aiSummary ?? null);
      setAlerts(a.alerts);
    } catch (error) {
      setAlertsError(error instanceof Error ? error.message : "Load failed.");
    } finally {
      setCaseLoading(false);
    }
  }, [instanceId, caseId]);

  // Switching tiles clears the case selection and loads the new tile's cases.
  useEffect(() => {
    setCaseId(null);
    setDetail(null);
    setAiSummary(null);
    setAlerts([]);
    void refreshInvestigated();
    void loadCases();
  }, [instanceId, refreshInvestigated, loadCases]);

  // Selecting a case loads its metadata and alerts, and clears the observable/alert selection.
  useEffect(() => {
    setSelected(new Set());
    setActiveAlertId(null);
    setDetail(null);
    setAiSummary(null);
    setAlerts([]);
    void loadCase();
  }, [loadCase]);

  // Refresh re-fetches the current cases, case detail/alerts and insignia without losing selection.
  const refresh = useCallback(() => {
    void loadCases();
    void refreshInvestigated();
    if (caseId) void loadCase();
  }, [loadCases, loadCase, refreshInvestigated, caseId]);

  // Filter cases to those created within the selected window — same rule as the main case board.
  const visibleCases = useMemo(() => {
    const { from, to } = resolveTimeRange(range);
    return cases.filter((c) => c.createdAt >= from && c.createdAt <= to);
  }, [cases, range]);

  const toggleObservable = useCallback((kind: ObservableKind, value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = obsKey(kind, value);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((kind: ObservableKind, values: string[], select: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const value of values) {
        const key = obsKey(kind, value);
        if (select) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }, []);

  // Index linking observables <-> alerts, for cross-filtering and highlighting.
  const index = useMemo(() => buildObservableIndex(alerts), [alerts]);

  // MITRE ATT&CK TTPs pooled from the case's alerts, and the full context handed to the LLM prompt.
  const ttps = useMemo(() => extractTtps(alerts), [alerts]);
  const promptContext = useMemo(
    () => buildCaseContext(detail, alerts.length, ttps, index.groups),
    [detail, alerts.length, ttps, index.groups],
  );

  // Selected observables filter the alert table to the union of alerts containing any of them.
  const filterIds = useMemo(() => {
    if (selected.size === 0) return null;
    const ids = new Set<string>();
    for (const key of selected) for (const id of index.byObservable.get(key) ?? []) ids.add(id);
    return ids;
  }, [selected, index]);

  // Clicking an alert highlights the observables found in that alert.
  const highlighted = useMemo(
    () => (activeAlertId ? (index.byAlert.get(activeAlertId) ?? new Set<string>()) : new Set<string>()),
    [activeAlertId, index],
  );

  const toggleAlert = useCallback((id: string) => setActiveAlertId((prev) => (prev === id ? null : id)), []);

  const selectedObservables = useMemo<Observable[]>(
    () =>
      [...selected].map((key) => {
        const index = key.indexOf("::");
        return { kind: key.slice(0, index) as ObservableKind, value: key.slice(index + 2) };
      }),
    [selected],
  );

  const consoleUrl = useMemo(
    () => instances.find((i) => i.id === instanceId)?.consoleUrl ?? null,
    [instances, instanceId],
  );

  const selectedCaseName = useMemo(
    () => cases.find((c) => c.id === caseId)?.name ?? null,
    [cases, caseId],
  );

  return (
    <section className="flex h-[calc(100vh-11rem)] min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Microscope size={18} className="text-sc-accent" />
          <h2 className="text-lg font-semibold text-sc-text">Investigation Workspace</h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button onClick={refresh} disabled={casesLoading || caseLoading}>
            <RefreshCw size={15} className={casesLoading || caseLoading ? "animate-spin" : undefined} />
            Refresh
          </Button>
          <TimeRangePicker value={range} onChange={setRange} />
          <span className="text-[11px] text-sc-faint">Cases created · {describeRange(range)}</span>
        </div>
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

      {/* Left cases band · middle case detail + alerts · right investigation panel. */}
      <div className="grid min-h-0 flex-1 grid-cols-[16rem_minmax(0,1fr)_22rem] gap-3">
        <InvestigationCaseBand
          cases={visibleCases}
          loading={casesLoading}
          error={casesError}
          selectedId={caseId}
          investigatedIds={investigatedIds}
          onSelect={setCaseId}
        />

        <div className="flex min-h-0 flex-col gap-3">
          {caseId ? (
            <>
              {detail ? (
                <InvestigationCaseMeta
                  detail={detail}
                  ttps={ttps}
                  instanceId={instanceId ?? ""}
                  caseId={caseId}
                  caseName={selectedCaseName}
                  consoleUrl={consoleUrl}
                  aiSummary={aiSummary}
                />
              ) : (
                <div className="rounded-xl border border-sc-border-soft bg-sc-surface/50 px-4 py-6 text-center text-xs text-sc-faint">
                  {caseLoading ? "Loading case…" : "Case metadata unavailable."}
                </div>
              )}
              <div className="max-h-64 shrink-0 overflow-y-auto">
                <InvestigationObservables
                  groups={index.groups}
                  alertCount={alerts.length}
                  selected={selected}
                  highlighted={highlighted}
                  onToggle={toggleObservable}
                  onToggleGroup={toggleGroup}
                />
              </div>
              <div className="min-h-0 flex-1">
                <InvestigationAlertsTable
                  alerts={alerts}
                  loading={caseLoading}
                  error={alertsError}
                  filterIds={filterIds}
                  activeAlertId={activeAlertId}
                  onSelectAlert={toggleAlert}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-sc-border bg-sc-surface/40 px-4 text-center text-sm text-sc-faint">
              Select a case to view its metadata and alerts.
            </div>
          )}
        </div>

        <InvestigationPanel
          instanceId={instanceId ?? ""}
          caseId={caseId}
          caseName={selectedCaseName}
          selected={selectedObservables}
          promptContext={promptContext}
          isAdmin={isAdmin}
          onInvestigated={refreshInvestigated}
        />
      </div>
    </section>
  );
}
