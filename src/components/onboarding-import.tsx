"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OnboardingImportTable } from "@/components/onboarding-import-table";
import { OnboardingImportToolbar } from "@/components/onboarding-import-toolbar";
import { parseCsv } from "@/lib/csv";
import { loadBatch, saveBatch, type RowStatus } from "@/lib/onboarding-batch-store";
import type { ConnectorTemplate } from "@/lib/connector-templates";

interface ParsedCsv {
  header: string[];
  rows: string[][];
}

/** Uploads a filled onboarding CSV, mirrors it, and creates connectors row-by-row from a template. */
export function OnboardingImport({ templates }: { templates: ConnectorTemplate[] }) {
  const [initial] = useState(loadBatch);
  const [templateId, setTemplateId] = useState(initial.templateId);
  const [data, setData] = useState<ParsedCsv | null>(
    initial.header.length ? { header: initial.header, rows: initial.rows } : null,
  );
  const [fileName, setFileName] = useState(initial.fileName);
  const [statuses, setStatuses] = useState<RowStatus[]>(initial.statuses);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusesRef = useRef<RowStatus[]>(initial.statuses);
  const pausedRef = useRef(false);
  const rowsRef = useRef<string[][]>(initial.rows);

  // Persist the batch (template, file, rows and statuses) so it survives a reload.
  useEffect(() => {
    saveBatch({ templateId, fileName, header: data?.header ?? [], rows: data?.rows ?? [], statuses });
  }, [templateId, fileName, data, statuses]);

  const templateOptions = useMemo(
    () => templates.map((t) => ({ value: t.id, label: `${t.name} · ${t.instanceName}` })),
    [templates],
  );

  const setStatus = (index: number, status: RowStatus) => {
    statusesRef.current = statusesRef.current.map((existing, i) => (i === index ? status : existing));
    setStatuses(statusesRef.current);
  };

  const onFile = async (file: File) => {
    try {
      const table = parseCsv(await file.text());
      if (table.length < 1) throw new Error("The CSV is empty.");
      const [header, ...rows] = table;
      rowsRef.current = rows;
      statusesRef.current = rows.map(() => ({ state: "idle" as const }));
      setData({ header, rows });
      setStatuses(statusesRef.current);
      setFileName(file.name);
      setError(null);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not read the CSV.");
    }
  };

  const editCell = (rowIndex: number, colIndex: number, value: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const rows = prev.rows.map((row, i) => (i === rowIndex ? row.map((cell, c) => (c === colIndex ? value : cell)) : row));
      rowsRef.current = rows;
      return { ...prev, rows };
    });
    // Editing a row clears its previous result so it can be re-run.
    if (statusesRef.current[rowIndex]?.state !== "idle") setStatus(rowIndex, { state: "idle" });
  };

  const deleteRow = (rowIndex: number) => {
    setData((prev) => {
      if (!prev) return prev;
      const rows = prev.rows.filter((_, i) => i !== rowIndex);
      rowsRef.current = rows;
      return rows.length ? { ...prev, rows } : null;
    });
    statusesRef.current = statusesRef.current.filter((_, i) => i !== rowIndex);
    setStatuses(statusesRef.current);
  };

  const deleteBatch = () => {
    setData(null);
    setFileName("");
    rowsRef.current = [];
    statusesRef.current = [];
    setStatuses([]);
  };

  const runRow = async (index: number) => {
    if (!templateId || !data) return;
    setStatus(index, { state: "running" });
    const values = Object.fromEntries(data.header.map((column, i) => [column, rowsRef.current[index][i] ?? ""]));
    try {
      const response = await fetch(`/api/connector-templates/${templateId}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.ok) setStatus(index, { state: "success" });
      else setStatus(index, { state: "failure", error: body.error ?? `HTTP ${response.status}` });
    } catch (thrown) {
      setStatus(index, { state: "failure", error: thrown instanceof Error ? thrown.message : "Request failed." });
    }
  };

  const runAll = async () => {
    if (!templateId || !data) return;
    setRunning(true);
    setPaused(false);
    pausedRef.current = false;
    for (let i = 0; i < rowsRef.current.length; i++) {
      if (pausedRef.current) break;
      if (statusesRef.current[i]?.state === "success") continue;
      await runRow(i);
    }
    setRunning(false);
    if (pausedRef.current) setPaused(true);
  };

  const pause = () => {
    pausedRef.current = true;
  };

  const counts = useMemo(() => {
    const success = statuses.filter((s) => s.state === "success").length;
    const failure = statuses.filter((s) => s.state === "failure").length;
    return { success, failure, pending: statuses.length - success };
  }, [statuses]);

  return (
    <section className="space-y-2 border-t border-sc-border-soft pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-sc-text">Onboarding batch</h3>
          {data ? (
            <span className="text-xs text-sc-faint">
              {fileName} · {data.rows.length} rows · {counts.success} ok · {counts.failure} failed
            </span>
          ) : null}
        </div>
        <OnboardingImportToolbar
          templateId={templateId}
          templateOptions={templateOptions}
          onTemplateChange={setTemplateId}
          onFile={(file) => void onFile(file)}
          hasData={Boolean(data)}
          running={running}
          paused={paused}
          createDisabled={!templateId || counts.pending === 0}
          onCreateAll={() => void runAll()}
          onPause={pause}
          onDeleteBatch={deleteBatch}
        />
      </div>

      {error ? <p className="text-xs text-critical">{error}</p> : null}
      {data && !templateId ? (
        <p className="text-[11px] text-high">Select the template this CSV was generated from to enable creation.</p>
      ) : null}

      {!data ? (
        <p className="rounded-lg border border-dashed border-sc-border bg-sc-surface/50 px-4 py-8 text-center text-sm text-sc-faint">
          Upload a filled clone CSV to preview and create the connectors.
        </p>
      ) : (
        <OnboardingImportTable
          header={data.header}
          rows={data.rows}
          statuses={statuses}
          busy={running}
          onEditCell={editCell}
          onRunRow={(index) => void runRow(index)}
          onDeleteRow={deleteRow}
        />
      )}
    </section>
  );
}
