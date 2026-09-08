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
  const columns = db.prepare("PRAGMA table_info(instances)").all() as unknown as Array<{ name: string }>;
  const has = (name: string) => columns.some((column) => column.name === name);
  if (!has("console_build_hash")) {
    db.exec("ALTER TABLE instances ADD COLUMN console_build_hash TEXT");
  }
}

// Next.js dev reloads modules on every edit; keep one handle on the global.
const globalForDb = globalThis as typeof globalThis & { galaxyDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  globalForDb.galaxyDb ??= open();
  return globalForDb.galaxyDb;
}
