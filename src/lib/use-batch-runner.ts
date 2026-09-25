"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseCsv } from "@/lib/csv";
import { loadBatch, saveBatch, type RowStatus } from "@/lib/onboarding-batch-store";

export interface BatchData {
  header: string[];
  rows: string[][];
}
export interface SubmitResult {
  ok: boolean;
  error?: string;
}

/**
 * Shared engine for the CSV batch tables (connectors and tenants): parsing, persistence, editing,
 * per-row and sequential (pause/continue) creation, and delete. `submit` runs one row's values.
 */
export function useBatchRunner(
  storageKey: string,
  submit: (values: Record<string, string>) => Promise<SubmitResult>,
) {
  const [initial] = useState(() => loadBatch(storageKey));
  const [data, setData] = useState<BatchData | null>(
    initial.header.length ? { header: initial.header, rows: initial.rows } : null,
  );
  const [fileName, setFileName] = useState(initial.fileName);
  const [statuses, setStatuses] = useState<RowStatus[]>(initial.statuses);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusesRef = useRef<RowStatus[]>(initial.statuses);
  const rowsRef = useRef<string[][]>(initial.rows);
  const pausedRef = useRef(false);

  useEffect(() => {
    saveBatch(storageKey, { fileName, header: data?.header ?? [], rows: data?.rows ?? [], statuses });
  }, [storageKey, fileName, data, statuses]);

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
      const rows = prev.rows.map((row, i) => (i === rowIndex ? row.map((c, ci) => (ci === colIndex ? value : c)) : row));
      rowsRef.current = rows;
      return { ...prev, rows };
    });
    if (statusesRef.current[rowIndex]?.state !== "idle") setStatus(rowIndex, { state: "idle" });
  };

  /** Appends a blank row; when the table is empty, seeds the header from `defaultHeader`. */
  const addRow = (defaultHeader?: string[]) => {
    setData((prev) => {
      const header = prev?.header ?? defaultHeader ?? [];
      if (header.length === 0) return prev;
      const rows = [...(prev?.rows ?? []), header.map(() => "")];
      rowsRef.current = rows;
      return { header, rows };
    });
    statusesRef.current = [...statusesRef.current, { state: "idle" }];
    setStatuses(statusesRef.current);
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
    if (!data) return;
    setStatus(index, { state: "running" });
    const values = Object.fromEntries(data.header.map((column, i) => [column, rowsRef.current[index][i] ?? ""]));
    try {
      const result = await submit(values);
      setStatus(index, result.ok ? { state: "success" } : { state: "failure", error: result.error });
    } catch (thrown) {
      setStatus(index, { state: "failure", error: thrown instanceof Error ? thrown.message : "Request failed." });
    }
  };

  const runAll = async () => {
    if (!data) return;
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

  return { data, fileName, statuses, running, paused, error, counts, onFile, addRow, editCell, deleteRow, deleteBatch, runRow, runAll, pause };
}
