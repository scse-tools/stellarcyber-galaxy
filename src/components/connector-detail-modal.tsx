"use client";

import { Modal } from "@/components/ui/modal";
import { cn, epochMs, formatEpoch, formatRelativeTime } from "@/lib/utils";
import { cellText, type Row } from "@/lib/table-export";
import { cellTone, displayCell, sectionize, TONE_TEXT } from "@/lib/inventory-columns";
import { Pill } from "@/components/detail-ui";

/** Fields shown in the hero/activity area, so the details grid doesn't repeat them. */
const HERO_FIELDS = new Set([
  "name", "status", "status_code", "status_message", "status_status_time", "active", "is_collect",
  "is_respond", "category", "type", "version", "configuration", "last_data_received", "last_activity",
]);
/** Fields whose numeric value is an epoch timestamp, rendered as readable dates. */
const TS_FIELDS = new Set(["created_at", "modified_at", "status_status_time", "last_activity", "last_data_received"]);

const cellFor = (column: string, value: unknown) =>
  TS_FIELDS.has(column) ? formatEpoch(value) || displayCell(column, value) : displayCell(column, value);

const AGE_TEXT = {
  good: "text-[var(--severity-success)]",
  warn: "text-high",
  bad: "text-critical",
} as const;
const ageTone = (ms: number): keyof typeof AGE_TEXT => {
  const age = Date.now() - ms;
  return age < 3_600_000 ? "good" : age < 86_400_000 ? "warn" : "bad";
};

export function ConnectorDetailModal({ connector, onClose }: { connector: Row | null; onClose: () => void }) {
  if (!connector) return null;

  const name = cellText(connector.name) || "Connector";
  const code = Number(connector.status_code);
  const knownHealth = Number.isFinite(code);
  const healthy = knownHealth && code === 0;
  const message = cellText(connector.status_message);
  const sections = sectionize(Object.keys(connector), "type");

  let configuration = cellText(connector.configuration);
  try {
    configuration = JSON.stringify(JSON.parse(configuration), null, 2);
  } catch {
    /* leave as-is when it isn't JSON */
  }

  return (
    <Modal
      open
      title={name}
      description={[cellText(connector.type), cellText(connector.category)].filter(Boolean).join(" · ") || undefined}
      onClose={onClose}
      className="max-w-[min(94vw,880px)]"
    >
      <div className="flex flex-wrap gap-2">
        <Pill
          label={!knownHealth ? "Status unknown" : healthy ? "Healthy" : "Issues"}
          tone={!knownHealth ? "muted" : healthy ? "good" : "bad"}
        />
        <Pill label={connector.active === true ? "Active" : "Inactive"} tone={connector.active === true ? "good" : "muted"} />
        <Pill label={connector.is_collect === true ? "Collecting" : "Not collecting"} tone={connector.is_collect === true ? "info" : "muted"} />
        <Pill label={connector.is_respond === true ? "Responding" : "Not responding"} tone={connector.is_respond === true ? "info" : "muted"} />
        {connector.version ? <Pill label={`v${cellText(connector.version)}`} tone="muted" /> : null}
      </div>

      {message && !healthy ? (
        <p className="mt-3 rounded-md border border-critical/40 bg-critical/10 px-3 py-2 text-[11px] text-critical">
          {message}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <TimeCard label="Last data received" value={connector.last_data_received} />
        <TimeCard label="Last activity" value={connector.last_activity} />
      </div>

      <div className="mt-5 max-h-[42vh] space-y-4 overflow-y-auto pr-1">
        {sections.map((section) => {
          const fields = section.columns.filter((c) => !HERO_FIELDS.has(c));
          if (fields.length === 0) return null;
          return (
            <div key={section.label}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: `hsl(${section.hue})` }}>
                {section.label}
              </p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-4 gap-y-1.5">
                {fields.map((column) => {
                  const text = cellFor(column, connector[column]);
                  const tone = cellTone(column, connector[column], connector);
                  return (
                    <div key={column} className="flex items-baseline justify-between gap-2 text-[11px]">
                      <span className="shrink-0 text-sc-faint">{column}</span>
                      <span className={cn("truncate text-right", tone ? `${TONE_TEXT[tone]} font-medium` : "text-sc-text")} title={text}>
                        {text || "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {configuration ? (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-sc-faint">configuration</p>
            <pre className="max-h-56 overflow-auto rounded-md border border-sc-border-soft bg-sc-surface px-3 py-2 font-mono text-[10px] text-sc-text">
              {configuration}
            </pre>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function TimeCard({ label, value }: { label: string; value: unknown }) {
  const ms = epochMs(value);
  return (
    <div className="rounded-lg border border-sc-border-soft bg-sc-raised/40 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-sc-faint">{label}</p>
      {ms === null ? (
        <p className="mt-1 text-sm text-sc-faint">—</p>
      ) : (
        <>
          <p className="mt-1 font-mono text-[13px] tabular-nums text-sc-text">{formatEpoch(value)}</p>
          <p className={cn("text-[11px] font-medium", AGE_TEXT[ageTone(ms)])}>
            {formatRelativeTime(new Date(ms).toISOString())}
          </p>
        </>
      )}
    </div>
  );
}
