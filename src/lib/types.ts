export const SEVERITIES = ["critical", "high", "medium", "low"] as const;

export type Severity = (typeof SEVERITIES)[number];

export type SeverityCounts = Record<Severity, number>;

export type AuthMode = "bearer" | "basic";

/** A Stellar Cyber instance as stored on disk. Secret fields hold GCM envelopes. */
export interface InstanceRow {
  id: string;
  name: string;
  consoleUrl: string;
  mcpUrl: string;
  authMode: AuthMode;
  toolName: string | null;
  toolArgs: string | null;
  tenantId: string | null;
  consoleBuildHash: string | null;
  position: number;
  usernameEnc: string;
  passwordEnc: string;
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
  authMode: AuthMode;
  toolName: string | null;
  tenantId: string | null;
  consoleBuildHash: string | null;
  position: number;
  username: string;
  hasApiKey: boolean;
  hasPassword: boolean;
}

export type InstanceStatus = "ok" | "error";

export interface InstanceStats {
  instanceId: string;
  status: InstanceStatus;
  counts: SeverityCounts;
  total: number;
  toolUsed: string | null;
  latencyMs: number;
  fetchedAt: string;
  error?: string;
}

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
