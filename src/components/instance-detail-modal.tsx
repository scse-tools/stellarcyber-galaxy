"use client";

import { useEffect } from "react";
import { ExternalLink, Pencil, PlugZap, RefreshCw, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { SeverityBar } from "@/components/severity-bar";
import { SensorStatusBlock } from "@/components/sensor-status";
import { McpTestPanel } from "@/components/mcp-test-panel";
import { ConsoleControls } from "@/components/console-controls";
import { useConnectionTest } from "@/hooks/use-connection-test";
import { useGalaxyStore } from "@/store/instances-store";
import { describeRange, resolveTimeRange } from "@/lib/time-range";
import { SEVERITY_META } from "@/lib/severity";
import { formatRelativeTime, hostOf } from "@/lib/utils";
import { EMPTY_COUNTS, SEVERITIES, type InstanceStats, type InstanceSummary, type SensorStatus } from "@/lib/types";

interface DetailModalProps {
  instance: InstanceSummary | null;
  stats?: InstanceStats;
  sensors?: SensorStatus;
  refreshing?: boolean;
  onClose: () => void;
  onRefresh: (id: string) => void;
  onEdit: (instance: InstanceSummary) => void;
  onDelete: (instance: InstanceSummary) => void;
}

function deepLink(consoleUrl: string, path: string): string {
  try {
    return new URL(path, consoleUrl).toString();
  } catch {
    return consoleUrl;
  }
}

export function InstanceDetailModal({
  instance,
  stats,
  sensors,
  refreshing,
  onClose,
  onRefresh,
  onEdit,
  onDelete,
}: DetailModalProps) {
  const { running: testing, result: testResult, error: testError, run: runTest, reset } =
    useConnectionTest();
  const range = useGalaxyStore((state) => state.range);

  // A different tile means the previous test result no longer applies.
  useEffect(() => reset(), [instance?.id, reset]);

  if (!instance) return null;
  const counts = stats?.counts ?? EMPTY_COUNTS;
  const failed = stats?.status === "error";

  return (
    <Modal
      open
      title={instance.name}
      description={`${hostOf(instance.consoleUrl)} · connects as ${instance.username}`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <section className="rounded-lg border border-sc-border-soft bg-sc-raised/60 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-sc-faint">
              Open cases · {describeRange(range)}
            </span>
            <span className="font-mono text-3xl tabular-nums text-sc-text">
              {failed || !stats ? "—" : stats.total.toLocaleString()}
            </span>
          </div>
          <div className="mt-3">
            <SeverityBar counts={counts} muted={failed || !stats} />
          </div>
          <ul className="mt-4 space-y-2">
            {SEVERITIES.map((severity) => (
              <li key={severity} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-sc-muted">
                  <span
                    aria-hidden
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: SEVERITY_META[severity].token }}
                  />
                  {SEVERITY_META[severity].label}
                </span>
                <span className="font-mono tabular-nums text-sc-text">
                  {failed || !stats ? "–" : counts[severity].toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {failed ? (
          <p className="rounded-md border border-critical/40 bg-critical/10 px-3 py-2 text-xs text-critical">
            {stats?.error}
          </p>
        ) : null}

        <SensorStatusBlock sensors={sensors} loading={refreshing} />

        <dl className="grid grid-cols-2 gap-3 text-xs">
          <Meta label="MCP endpoint" value={hostOf(instance.mcpUrl)} />
          <Meta label="Auth" value={instance.authMode === "basic" ? "Basic" : "Bearer (API key)"} />
          <Meta label="Tool" value={stats?.toolUsed ?? instance.toolName ?? "auto-detect"} />
          <Meta
            label="Last poll"
            value={stats ? `${formatRelativeTime(stats.fetchedAt)} · ${stats.latencyMs}ms` : "never"}
          />
        </dl>

        <ConsoleControls instance={instance} />

        <div className="flex flex-wrap gap-2 border-t border-sc-border-soft pt-4">
          <a
            href={deepLink(instance.consoleUrl, "/cases")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-sc-border bg-sc-raised px-3 py-2 text-sm font-medium text-sc-text transition-colors hover:border-sc-link"
          >
            <ExternalLink size={15} /> Open cases page
          </a>
          <Button onClick={() => onRefresh(instance.id)} disabled={refreshing} aria-label="Refresh">
            <RefreshCw size={15} className={refreshing ? "animate-spin" : undefined} />
          </Button>
          <Button onClick={() => onEdit(instance)} aria-label="Edit instance">
            <Pencil size={15} />
          </Button>
          <Button variant="danger" onClick={() => onDelete(instance)} aria-label="Remove instance">
            <Trash2 size={15} />
          </Button>
        </div>

        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={() =>
              void runTest({ instanceId: instance.id, ...resolveTimeRange(range) })
            }
            disabled={testing}
          >
            <PlugZap size={15} />
            {testing ? "Testing…" : "Test MCP authentication"}
          </Button>
          <McpTestPanel running={testing} result={testResult} error={testError} />
        </div>
      </div>
    </Modal>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sc-faint">{label}</dt>
      <dd className="truncate text-sc-text">{value}</dd>
    </div>
  );
}
