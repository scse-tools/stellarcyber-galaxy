"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseCsv } from "@/lib/csv";

interface ParsedCsv {
  header: string[];
  rows: string[][];
}

/**
 * Uploads a filled onboarding CSV and mirrors it in a table with an (initially empty) Status column.
 * The row-by-row batch-create step will populate Status; the parsed rows are kept for that.
 */
export function OnboardingImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    try {
      const table = parseCsv(await file.text());
      if (table.length < 1) throw new Error("The CSV is empty.");
      const [header, ...rows] = table;
      setData({ header, rows });
      setFileName(file.name);
      setError(null);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not read the CSV.");
    }
  };

  return (
    <section className="space-y-2 border-t border-sc-border-soft pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-sc-text">Onboarding batch</h3>
          {data ? (
            <span className="text-xs text-sc-faint">
              {fileName} · {data.rows.length} row{data.rows.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
              event.target.value = "";
            }}
          />
          <Button onClick={() => inputRef.current?.click()}>
            <Upload size={15} /> Upload CSV
          </Button>
          {data ? (
            <Button onClick={() => setData(null)}>
              <X size={15} /> Clear
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-xs text-critical">{error}</p> : null}

      {!data ? (
        <p className="rounded-lg border border-dashed border-sc-border bg-sc-surface/50 px-4 py-8 text-center text-sm text-sc-faint">
          Upload a filled clone CSV to preview the connectors to create. Batch creation comes next.
        </p>
      ) : (
        <div className="max-h-[52vh] overflow-auto rounded-lg border border-sc-border-soft">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-sc-raised">
                <th className="w-10 border-b border-sc-border bg-sc-raised px-2 py-2 text-left font-medium uppercase tracking-wide text-[10px] text-sc-faint">
                  #
                </th>
                {data.header.map((column, index) => (
                  <th
                    key={`${column}-${index}`}
                    className="whitespace-nowrap border-b border-sc-border bg-sc-raised px-2 py-2 text-left font-medium uppercase tracking-wide text-[10px] text-sc-faint"
                  >
                    {column}
                  </th>
                ))}
                <th className="border-b border-sc-border bg-sc-raised px-2 py-2 text-left font-medium uppercase tracking-wide text-[10px] text-sc-faint">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-sc-border-soft odd:bg-sc-surface/40">
                  <td className="px-2 py-1.5 text-sc-faint">{rowIndex + 1}</td>
                  {data.header.map((_, colIndex) => (
                    <td key={colIndex} className="max-w-[240px] truncate px-2 py-1.5 text-sc-text" title={row[colIndex] ?? ""}>
                      {row[colIndex] ?? ""}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-sc-faint">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
