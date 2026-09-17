"use client";

import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";
import { cellText, type Row } from "@/lib/table-export";
import { cellTone, displayCell, sectionize, TONE_TEXT } from "@/lib/inventory-columns";

/** Fields rendered by the hero/metrics area, so the details grid doesn't repeat them. */
const HERO_FIELDS = new Set([
  "hostname", "connection_status", "feature", "need_upgrade", "cpu_usage", "disk_usage",
  "inbytes_total", "outbytes_total", "feedback",
]);

const num = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const usageTone = (pct: number) =>
  pct >= 90 ? "bg-critical" : pct >= 75 ? "bg-high" : "bg-[var(--severity-success)]";

export function SensorDetailModal({ sensor, onClose }: { sensor: Row | null; onClose: () => void }) {
  if (!sensor) return null;

  const hostname = cellText(sensor.hostname) || cellText(sensor.name) || "Sensor";
  const connection = cellText(sensor.connection_status);
  const connected = connection.toLowerCase() === "connected";
  const needUpgrade = sensor.need_upgrade === true || sensor.need_upgrade === "true";
  const noOutput = num(sensor.inbytes_total)! > 0 && num(sensor.outbytes_total)! <= 0;
  const cpu = Math.max(0, Math.min(100, num(sensor.cpu_usage) ?? 0));
  const disk = Math.max(0, Math.min(100, num(sensor.disk_usage) ?? 0));
  const feedback = cellText(sensor.feedback);
  const sections = sectionize(Object.keys(sensor), "feature");

  return (
    <Modal
      open
      title={hostname}
      description={cellText(sensor.local_ip_address) || cellText(sensor.feature) || undefined}
      onClose={onClose}
      className="max-w-[min(94vw,880px)]"
    >
      <div className="flex flex-wrap gap-2">
        <Pill label={connected ? "Connected" : connection || "Disconnected"} tone={connected ? "good" : "bad"} />
        {sensor.feature ? <Pill label={cellText(sensor.feature).toUpperCase()} tone="info" /> : null}
        <Pill label={needUpgrade ? "Upgrade available" : "Up to date"} tone={needUpgrade ? "warn" : "good"} />
        {noOutput ? <Pill label="No output" tone="warn" /> : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Bar label="CPU usage" pct={cpu} />
        <Bar label="Disk usage" pct={disk} />
        <Throughput label="Bytes in" bytes={num(sensor.inbytes_total) ?? 0} icon={<ArrowDownToLine size={14} />} />
        <Throughput label="Bytes out" bytes={num(sensor.outbytes_total) ?? 0} tone={noOutput ? "warn" : undefined} icon={<ArrowUpFromLine size={14} />} />
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
                  const text = displayCell(column, sensor[column]);
                  const tone = cellTone(column, sensor[column], sensor);
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

        {feedback.includes("\n") ? (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-sc-faint">feedback</p>
            <pre className="max-h-56 overflow-auto rounded-md border border-sc-border-soft bg-sc-surface px-3 py-2 font-mono text-[10px] text-sc-text">
              {feedback}
            </pre>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

const PILL_TONE = {
  good: "border-[var(--severity-success)]/40 bg-[var(--severity-success)]/10 text-[var(--severity-success)]",
  bad: "border-critical/40 bg-critical/10 text-critical",
  warn: "border-high/40 bg-high/10 text-high",
  info: "border-sc-link/40 bg-sc-link/10 text-sc-link",
} as const;

function Pill({ label, tone }: { label: string; tone: keyof typeof PILL_TONE }) {
  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", PILL_TONE[tone])}>
      {label}
    </span>
  );
}

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="rounded-lg border border-sc-border-soft bg-sc-raised/40 px-3 py-2.5">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wide text-sc-faint">{label}</span>
        <span className="font-mono text-sm tabular-nums text-sc-text">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sc-surface">
        <div className={cn("h-full rounded-full transition-all", usageTone(pct))} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Throughput({
  label,
  bytes,
  icon,
  tone,
}: {
  label: string;
  bytes: number;
  icon: React.ReactNode;
  tone?: "warn";
}) {
  return (
    <div className="rounded-lg border border-sc-border-soft bg-sc-raised/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-sc-faint">
        {icon} {label}
      </div>
      <p className={cn("mt-1 font-mono text-lg tabular-nums", tone === "warn" ? "text-high" : "text-sc-text")}>
        {formatBytes(bytes)}
      </p>
    </div>
  );
}
