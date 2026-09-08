export const SEVERITIES = ["critical", "high", "medium", "low"] as const;

export type Severity = (typeof SEVERITIES)[number];

export type SeverityCounts = Record<Severity, number>;

/** A Stellar Cyber instance as stored on disk. Secret fields hold GCM envelopes. */
export interface InstanceRow {
  id: string;
  name: string;
  consoleUrl: string;
  mcpUrl: string;
  toolName: string | null;
  toolArgs: string | null;
  tenantId: string | null;
  position: number;
  apiKeyEnc: string;
  createdAt: string;
  updatedAt: string;
}

/** The shape sent to the browser. Contains no secret material of any kind. */
export interface InstanceSummary {
  id: string;
  name: string;
  consoleUrl: string;
  mcpUrl: string;
  toolName: string | null;
  tenantId: string | null;
  position: number;
  hasApiKey: boolean;
}

export type InstanceStatus = "ok" | "error";

export interface InstanceStats {
  instanceId: string;
  status: InstanceStatus;
  counts: SeverityCounts;
  /** Open statuses counted, in display order (e.g. ["New", "In Progress"]). */
  statuses: string[];
  /** Per-severity split across those statuses; empty when the fallback path is used. */
  statusCounts: Record<Severity, Record<string, number>>;
  total: number;
  toolUsed: string | null;
  latencyMs: number;
  fetchedAt: string;
  error?: string;
}

export interface ConnectorStatus {
  instanceId: string;
  status: InstanceStatus;
  /** Collecting connectors only (is_collect === true). */
  total: number;
  active: number;
  healthy: number;
  issues: number;
  fetchedAt: string;
  error?: string;
}

export const EMPTY_STATUS_COUNTS = (): Record<Severity, Record<string, number>> => ({
  critical: {},
  high: {},
  medium: {},
  low: {},
});

export type TestStepStatus = "ok" | "fail" | "skipped";

export interface McpTestStep {
  name: string;
  status: TestStepStatus;
  detail: string;
  ms: number;
}

export interface McpTestResult {
  ok: boolean;
  transport: string | null;
  steps: McpTestStep[];
  counts?: SeverityCounts;
  total?: number;
  toolUsed?: string | null;
}

export type SensorHealth = "healthy" | "trouble" | "unknown";

export interface SensorStatus {
  instanceId: string;
  status: InstanceStatus;
  total: number;
  /** Counts per `feature` value (wds, modular, ds, …). */
  byFeature: Record<string, number>;
  connection: { connected: number; disconnected: number; other: number };
  upgrade: { need: number; ok: number };
  fetchedAt: string;
  error?: string;
}

export const EMPTY_COUNTS: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
