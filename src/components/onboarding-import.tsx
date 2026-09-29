"use client";

import { useMemo, useState } from "react";
import { OnboardingImportTable } from "@/components/onboarding-import-table";
import { OnboardingImportToolbar } from "@/components/onboarding-import-toolbar";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useBatchRunner } from "@/lib/use-batch-runner";
import type { InstanceSummary } from "@/lib/types";

const BATCH_KEY = "galaxy.onboardingBatch";

/**
 * Uploads a filled clone CSV and creates connectors row-by-row on the selected server. Each row
 * carries its own type/category, so no template is chosen here — just the target server.
 */
export function OnboardingImport({ instances }: { instances: InstanceSummary[] }) {
  const [serverId, setServerId] = useState("");

  const batch = useBatchRunner(BATCH_KEY, async (values) => {
    if (!serverId) return { ok: false, error: "Select a server first." };
    const response = await fetch(`/api/instances/${serverId}/connectors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
    const body = await response.json().catch(() => ({}));
    return { ok: response.ok && body.ok, error: body.error ?? (response.ok ? undefined : `HTTP ${response.status}`) };
  });

  const serverOptions = useMemo(
    () =>
      [...instances]
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .map((instance) => ({ value: instance.id, label: instance.name })),
    [instances],
  );

  return (
    <section className="space-y-2 border-t border-sc-border-soft pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-sc-text">Onboarding batch</h3>
          <SearchableSelect
            value={serverId}
            onChange={setServerId}
            ariaLabel="Target server"
            title="The server the connectors are created on"
            className="w-56 rounded-md border border-sc-border bg-sc-surface px-2 py-1.5 text-sm text-sc-text hover:bg-sc-active"
            options={[{ value: "", label: "Select a server…" }, ...serverOptions]}
          />
          {batch.data ? (
            <span className="text-xs text-sc-faint">
              {batch.fileName} · {batch.data.rows.length} rows · {batch.counts.success} ok · {batch.counts.failure} failed
            </span>
          ) : null}
        </div>
        <OnboardingImportToolbar
          onFile={(file) => void batch.onFile(file)}
          hasData={Boolean(batch.data)}
          running={batch.running}
          paused={batch.paused}
          createDisabled={!serverId || batch.counts.pending === 0}
          onCreateAll={() => void batch.runAll()}
          onPause={batch.pause}
          onDeleteBatch={batch.deleteBatch}
        />
      </div>

      {batch.error ? <p className="text-xs text-critical">{batch.error}</p> : null}
      {batch.data && !serverId ? (
        <p className="text-[11px] text-high">Select the target server to enable creation.</p>
      ) : null}

      {!batch.data ? (
        <p className="rounded-lg border border-dashed border-sc-border bg-sc-surface/50 px-4 py-8 text-center text-sm text-sc-faint">
          Download a template CSV above, fill it, then upload it here and pick the target server.
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
