"use client";

import { useRef } from "react";
import { Pause, Play, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OnboardingImportTable } from "@/components/onboarding-import-table";
import { useBatchRunner } from "@/lib/use-batch-runner";

const BATCH_KEY = "galaxy.tenantBatch";

/** Uploads a tenants CSV and creates tenants row-by-row on the selected server. */
export function TenantsImport({ instanceId }: { instanceId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const batch = useBatchRunner(BATCH_KEY, async (values) => {
    if (!instanceId) return { ok: false, error: "Select a server first." };
    const response = await fetch(`/api/instances/${instanceId}/tenants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
    const body = await response.json().catch(() => ({}));
    return { ok: response.ok && body.ok, error: body.error ?? (response.ok ? undefined : `HTTP ${response.status}`) };
  });

  return (
    <section className="space-y-2 border-t border-sc-border-soft pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-sc-text">Tenant batch</h3>
          {batch.data ? (
            <span className="text-xs text-sc-faint">
              {batch.fileName} · {batch.data.rows.length} rows · {batch.counts.success} ok · {batch.counts.failure} failed
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void batch.onFile(file);
              event.target.value = "";
            }}
          />
          <Button onClick={() => inputRef.current?.click()}>
            <Upload size={15} /> Upload CSV
          </Button>
          {batch.data && !batch.running ? (
            <Button variant="primary" onClick={() => void batch.runAll()} disabled={!instanceId || batch.counts.pending === 0}>
              <Play size={15} /> {batch.paused ? "Continue" : "Create all"}
            </Button>
          ) : null}
          {batch.running ? (
            <Button onClick={batch.pause}>
              <Pause size={15} /> Pause
            </Button>
          ) : null}
          {batch.data ? (
            <Button onClick={batch.deleteBatch} disabled={batch.running}>
              <Trash2 size={15} /> Delete batch
            </Button>
          ) : null}
        </div>
      </div>

      {batch.error ? <p className="text-xs text-critical">{batch.error}</p> : null}
      {batch.data && !instanceId ? (
        <p className="text-[11px] text-high">Select a server to enable tenant creation.</p>
      ) : null}

      {!batch.data ? (
        <p className="rounded-lg border border-dashed border-sc-border bg-sc-surface/50 px-4 py-8 text-center text-sm text-sc-faint">
          Upload a tenants CSV (a cust_name column is required) to preview and create tenants.
        </p>
      ) : (
        <OnboardingImportTable
          header={batch.data.header}
          rows={batch.data.rows}
          statuses={batch.statuses}
          busy={batch.running}
          onEditCell={batch.editCell}
          onRunRow={(index) => void batch.runRow(index)}
          onDeleteRow={batch.deleteRow}
        />
      )}
    </section>
  );
}
