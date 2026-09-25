"use client";

import { useEffect, useMemo, useState } from "react";
import { OnboardingImportTable } from "@/components/onboarding-import-table";
import { OnboardingImportToolbar } from "@/components/onboarding-import-toolbar";
import { useBatchRunner } from "@/lib/use-batch-runner";
import type { ConnectorTemplate } from "@/lib/connector-templates";

const BATCH_KEY = "galaxy.onboardingBatch";
const TEMPLATE_KEY = "galaxy.onboardingTemplateId";

/** Uploads a filled onboarding CSV and creates connectors row-by-row from a template. */
export function OnboardingImport({ templates }: { templates: ConnectorTemplate[] }) {
  const [templateId, setTemplateId] = useState(() => {
    try {
      return window.localStorage.getItem(TEMPLATE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(TEMPLATE_KEY, templateId);
    } catch {
      /* ignore */
    }
  }, [templateId]);

  const batch = useBatchRunner(BATCH_KEY, async (values) => {
    if (!templateId) return { ok: false, error: "Select a template first." };
    const response = await fetch(`/api/connector-templates/${templateId}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
    const body = await response.json().catch(() => ({}));
    return { ok: response.ok && body.ok, error: body.error ?? (response.ok ? undefined : `HTTP ${response.status}`) };
  });

  const templateOptions = useMemo(
    () => templates.map((t) => ({ value: t.id, label: `${t.name} · ${t.instanceName}` })),
    [templates],
  );

  return (
    <section className="space-y-2 border-t border-sc-border-soft pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-sc-text">Onboarding batch</h3>
          {batch.data ? (
            <span className="text-xs text-sc-faint">
              {batch.fileName} · {batch.data.rows.length} rows · {batch.counts.success} ok · {batch.counts.failure} failed
            </span>
          ) : null}
        </div>
        <OnboardingImportToolbar
          templateId={templateId}
          templateOptions={templateOptions}
          onTemplateChange={setTemplateId}
          onFile={(file) => void batch.onFile(file)}
          hasData={Boolean(batch.data)}
          running={batch.running}
          paused={batch.paused}
          createDisabled={!templateId || batch.counts.pending === 0}
          onCreateAll={() => void batch.runAll()}
          onPause={batch.pause}
          onDeleteBatch={batch.deleteBatch}
        />
      </div>

      {batch.error ? <p className="text-xs text-critical">{batch.error}</p> : null}
      {batch.data && !templateId ? (
        <p className="text-[11px] text-high">Select the template this CSV was generated from to enable creation.</p>
      ) : null}

      {!batch.data ? (
        <p className="rounded-lg border border-dashed border-sc-border bg-sc-surface/50 px-4 py-8 text-center text-sm text-sc-faint">
          Upload a filled clone CSV to preview and create the connectors.
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
