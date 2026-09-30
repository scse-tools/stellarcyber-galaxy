import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import type {
  Evidence,
  EvidenceType,
  Finding,
  Investigation,
  InvestigationRun,
  Observable,
  RunStatus,
} from "@/lib/investigation/types";
import type { ObservableKind } from "@/lib/observables";

interface InvRow {
  id: string;
  instance_id: string;
  case_id: string;
  case_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Finds (or creates) the single investigation session for a case. */
export function getOrCreateInvestigation(
  instanceId: string,
  caseId: string,
  caseName: string | null,
  userId: string | null,
): InvRow {
  const db = getDb();
  const existing = db
    .prepare("SELECT * FROM investigations WHERE instance_id = ? AND case_id = ?")
    .get(instanceId, caseId) as unknown as InvRow | undefined;
  if (existing) return existing;
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO investigations (id, instance_id, case_id, case_name, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(id, instanceId, caseId, caseName, userId, now, now);
  return db.prepare("SELECT * FROM investigations WHERE id = ?").get(id) as unknown as InvRow;
}

function touch(investigationId: string): void {
  getDb().prepare("UPDATE investigations SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), investigationId);
}

/** Case ids on an instance that have at least one investigation (for the cases-table insignia). */
export function investigatedCaseIds(instanceId: string): string[] {
  const rows = getDb()
    .prepare("SELECT case_id FROM investigations WHERE instance_id = ?")
    .all(instanceId) as unknown as { case_id: string }[];
  return rows.map((row) => row.case_id);
}

export interface NewRun {
  investigationId: string;
  providerId: string | null;
  providerLabel: string | null;
  model: string | null;
  observables: Observable[];
  status: RunStatus;
  summary: string | null;
  recommendation: string | null;
  verdict: string | null;
  error: string | null;
  createdBy: string | null;
  findings: Omit<Finding, "id" | "createdAt">[];
}

export function saveRun(run: NewRun): string {
  const db = getDb();
  const runId = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO investigation_runs
      (id, investigation_id, provider_id, provider_label, model, observables_json, status, summary, recommendation, verdict, error, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    runId,
    run.investigationId,
    run.providerId,
    run.providerLabel,
    run.model,
    JSON.stringify(run.observables),
    run.status,
    run.summary,
    run.recommendation,
    run.verdict,
    run.error,
    run.createdBy,
    now,
  );
  const insertFinding = db.prepare(
    `INSERT INTO investigation_findings
      (id, run_id, observable_kind, observable_value, source, verdict, summary, raw_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const finding of run.findings) {
    insertFinding.run(
      randomUUID(),
      runId,
      finding.observableKind,
      finding.observableValue,
      finding.source,
      finding.verdict,
      finding.summary,
      finding.raw === undefined ? null : JSON.stringify(finding.raw),
      now,
    );
  }
  touch(run.investigationId);
  return runId;
}

function findingsForRun(runId: string): Finding[] {
  const rows = getDb()
    .prepare("SELECT * FROM investigation_findings WHERE run_id = ? ORDER BY created_at")
    .all(runId) as unknown as Array<Record<string, string | null>>;
  return rows.map((row) => ({
    id: row.id!,
    observableKind: row.observable_kind as ObservableKind,
    observableValue: row.observable_value!,
    source: row.source!,
    verdict: row.verdict,
    summary: row.summary,
    raw: row.raw_json ? JSON.parse(row.raw_json) : null,
    createdAt: row.created_at!,
  }));
}

function runsForInvestigation(investigationId: string): InvestigationRun[] {
  const rows = getDb()
    .prepare("SELECT * FROM investigation_runs WHERE investigation_id = ? ORDER BY created_at DESC")
    .all(investigationId) as unknown as Array<Record<string, string | null>>;
  return rows.map((row) => ({
    id: row.id!,
    investigationId: row.investigation_id!,
    providerId: row.provider_id,
    providerLabel: row.provider_label,
    model: row.model,
    observables: JSON.parse(row.observables_json || "[]") as Observable[],
    status: (row.status as RunStatus) ?? "done",
    summary: row.summary,
    recommendation: row.recommendation,
    verdict: row.verdict,
    error: row.error,
    createdBy: row.created_by,
    createdAt: row.created_at!,
    findings: findingsForRun(row.id!),
  }));
}

function evidenceForInvestigation(investigationId: string): Evidence[] {
  const rows = getDb()
    .prepare("SELECT * FROM investigation_evidence WHERE investigation_id = ? ORDER BY created_at DESC")
    .all(investigationId) as unknown as Array<Record<string, string | null>>;
  return rows.map((row) => ({
    id: row.id!,
    investigationId: row.investigation_id!,
    type: row.type as EvidenceType,
    content: row.content,
    url: row.url,
    createdBy: row.created_by,
    createdAt: row.created_at!,
  }));
}

/** The full investigation for a case, or null if none exists yet. */
export function getInvestigation(instanceId: string, caseId: string): Investigation | null {
  const row = getDb()
    .prepare("SELECT * FROM investigations WHERE instance_id = ? AND case_id = ?")
    .get(instanceId, caseId) as unknown as InvRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    instanceId: row.instance_id,
    caseId: row.case_id,
    caseName: row.case_name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    runs: runsForInvestigation(row.id),
    evidence: evidenceForInvestigation(row.id),
  };
}

export function addEvidence(
  investigationId: string,
  type: EvidenceType,
  content: string | null,
  url: string | null,
  userId: string | null,
): Evidence {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO investigation_evidence (id, investigation_id, type, content, url, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(id, investigationId, type, content, url, userId, now);
  touch(investigationId);
  return { id, investigationId, type, content, url, createdBy: userId, createdAt: now };
}

export function deleteEvidence(id: string): void {
  getDb().prepare("DELETE FROM investigation_evidence WHERE id = ?").run(id);
}
