"use client";

import { Loader2, Play, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RowStatus } from "@/lib/onboarding-batch-store";

interface OnboardingImportTableProps {
  header: string[];
  rows: string[][];
  statuses: RowStatus[];
  busy: boolean;
  onEditCell: (row: number, col: number, value: string) => void;
  onRunRow: (row: number) => void;
  onDeleteRow: (row: number) => void;
}

export function OnboardingImportTable({
  header,
  rows,
  statuses,
  busy,
  onEditCell,
  onRunRow,
  onDeleteRow,
}: OnboardingImportTableProps) {
  return (
    <div className="max-h-[52vh] overflow-auto rounded-lg border border-sc-border-soft">
      <table className="w-full border-collapse text-[11px]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-sc-raised">
            <Th className="w-10">#</Th>
            {header.map((column, index) => (
              <Th key={`${column}-${index}`}>{column}</Th>
            ))}
            <Th className="w-40">Status</Th>
            <Th className="w-20 text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const status = statuses[rowIndex] ?? { state: "idle" };
            return (
              <tr key={rowIndex} className="border-b border-sc-border-soft odd:bg-sc-surface/40">
                <td className="px-2 py-1 text-sc-faint">{rowIndex + 1}</td>
                {header.map((_, colIndex) => (
                  <td key={colIndex} className="px-1 py-1">
                    <input
                      value={row[colIndex] ?? ""}
                      onChange={(event) => onEditCell(rowIndex, colIndex, event.target.value)}
                      className="w-full min-w-[7rem] rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sc-text hover:border-sc-border-soft focus:border-sc-link focus:bg-sc-surface focus:outline-none"
                    />
                  </td>
                ))}
                <td className="px-2 py-1"><StatusCell status={status} /></td>
                <td className="px-2 py-1">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onRunRow(rowIndex)}
                      disabled={busy || status.state === "running"}
                      title="Create this connector"
                      className="rounded p-1 text-sc-faint hover:bg-sc-active hover:text-sc-link disabled:opacity-40"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRow(rowIndex)}
                      disabled={busy}
                      title="Delete this row"
                      className="rounded p-1 text-sc-faint hover:bg-sc-active hover:text-critical disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusCell({ status }: { status: RowStatus }) {
  if (status.state === "running") {
    return (
      <span className="flex items-center gap-1.5 text-sc-faint">
        <Loader2 size={12} className="animate-spin" /> Running…
      </span>
    );
  }
  if (status.state === "success") {
    return <span className="font-medium text-[var(--severity-success)]">Success</span>;
  }
  if (status.state === "failure") {
    return (
      <span className="block truncate font-medium text-critical" title={status.error}>
        Failed: {status.error}
      </span>
    );
  }
  return <span className="text-sc-faint">—</span>;
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b border-sc-border bg-sc-raised px-2 py-2 text-left font-medium uppercase tracking-wide text-[10px] text-sc-faint",
        className,
      )}
    >
      {children}
    </th>
  );
}
