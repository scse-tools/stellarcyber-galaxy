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
  /** Sensors receiving input but forwarding no output — an error condition. */
  noOutput: number;
  /** Aggregate resource/throughput metrics across the instance's sensors. */
  metrics: SensorMetrics;
  fetchedAt: string;
  error?: string;
}

export interface SensorMetrics {
  /** Mean and peak CPU/disk usage (0–100) across sensors reporting a value. */
  cpuAvg: number;
  cpuMax: number;
  diskAvg: number;
  diskMax: number;
  /** Total bytes in/out across all sensors. */
  inBytes: number;
  outBytes: number;
}

export const EMPTY_COUNTS: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };

/** One MSSP tenant/customer visible to an instance's API key. */
export type ViewMode = "cases" | "health" | "studio";

export type LayoutMode = "grid" | "table";

/** Aggregate deployment health across all reachable instances, for the header rollup. */
export interface HealthTotals {
  sensorsTotal: number;
  sensorsDisconnected: number;
  sensorsNoOutput: number;
  connectorsActive: number;
  connectorsIssues: number;
}

export interface Tenant {
  id: string;
  name: string;
}

/** Raised when a poll finds more critical/high cases on an instance than the previous poll. */
export interface AlertNotification {
  id: string;
  instanceId: string;
  instanceName: string;
  severity: Extract<Severity, "critical" | "high">;
  /** How many new cases appeared in this bucket since the previous poll. */
  delta: number;
  /** The bucket's new total. */
  total: number;
  createdAt: string;
}
