import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS instances (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  console_url  TEXT NOT NULL,
  mcp_url      TEXT NOT NULL,
  auth_mode    TEXT NOT NULL DEFAULT 'bearer',
  tool_name    TEXT,
  tool_args    TEXT,
  tenant_id    TEXT,
  position     INTEGER NOT NULL DEFAULT 0,
  username_enc TEXT NOT NULL,
  password_enc TEXT NOT NULL,
  api_key_enc  TEXT NOT NULL,
  console_build_hash TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_instances_position ON instances (position, created_at);

CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,
  username              TEXT NOT NULL UNIQUE,
  password_hash         TEXT NOT NULL,
  role                  TEXT NOT NULL DEFAULT 'user',
  must_change_password  INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);

CREATE TABLE IF NOT EXISTS connector_templates (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  instance_id    TEXT NOT NULL,
  instance_name  TEXT NOT NULL,
  connector_type TEXT NOT NULL,
  connector_name TEXT NOT NULL,
  fields_json    TEXT NOT NULL,
  mutable_json   TEXT NOT NULL,
  include_all_config INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_connector_templates_created ON connector_templates (created_at);

CREATE TABLE IF NOT EXISTS llm_providers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL,
  model       TEXT NOT NULL,
  base_url    TEXT,
  api_key_enc TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 1,
  is_default  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ti_sources (
  key         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  api_key_enc TEXT,
  enabled     INTEGER NOT NULL DEFAULT 0,
  config_json TEXT,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS investigations (
  id          TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,
  case_id     TEXT NOT NULL,
  case_name   TEXT,
  created_by  TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  UNIQUE (instance_id, case_id)
);
CREATE INDEX IF NOT EXISTS idx_investigations_case ON investigations (instance_id, case_id);

CREATE TABLE IF NOT EXISTS investigation_runs (
  id               TEXT PRIMARY KEY,
  investigation_id TEXT NOT NULL,
  provider_id      TEXT,
  provider_label   TEXT,
  model            TEXT,
  observables_json TEXT NOT NULL,
  status           TEXT NOT NULL,
  summary          TEXT,
  recommendation   TEXT,
  verdict          TEXT,
  error            TEXT,
  created_by       TEXT,
  created_at       TEXT NOT NULL,
  FOREIGN KEY (investigation_id) REFERENCES investigations (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_runs_investigation ON investigation_runs (investigation_id, created_at);

CREATE TABLE IF NOT EXISTS investigation_findings (
  id               TEXT PRIMARY KEY,
  run_id           TEXT NOT NULL,
  observable_kind  TEXT NOT NULL,
  observable_value TEXT NOT NULL,
  source           TEXT NOT NULL,
  verdict          TEXT,
  summary          TEXT,
  raw_json         TEXT,
  created_at       TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES investigation_runs (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_findings_run ON investigation_findings (run_id);

CREATE TABLE IF NOT EXISTS investigation_evidence (
  id               TEXT PRIMARY KEY,
  investigation_id TEXT NOT NULL,
  type             TEXT NOT NULL,
  content          TEXT,
  url              TEXT,
  created_by       TEXT,
  created_at       TEXT NOT NULL,
  FOREIGN KEY (investigation_id) REFERENCES investigations (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_evidence_investigation ON investigation_evidence (investigation_id, created_at);
`;

function databasePath(): string {
  return process.env.GALAXY_DB_PATH ?? join(process.cwd(), "data", "galaxy.db");
}

function open(): DatabaseSync {
  const path = databasePath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

/** Adds columns introduced after a database was first created. */
function migrate(db: DatabaseSync): void {
  const instanceCols = db.prepare("PRAGMA table_info(instances)").all() as unknown as Array<{ name: string }>;
  if (!instanceCols.some((c) => c.name === "console_build_hash")) {
    db.exec("ALTER TABLE instances ADD COLUMN console_build_hash TEXT");
  }
  const templateCols = db
    .prepare("PRAGMA table_info(connector_templates)")
    .all() as unknown as Array<{ name: string }>;
  if (templateCols.length && !templateCols.some((c) => c.name === "include_all_config")) {
    db.exec("ALTER TABLE connector_templates ADD COLUMN include_all_config INTEGER NOT NULL DEFAULT 0");
  }
}

// Next.js dev reloads modules on every edit; keep one handle on the global.
const globalForDb = globalThis as typeof globalThis & { galaxyDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  globalForDb.galaxyDb ??= open();
  return globalForDb.galaxyDb;
}
