import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import type { InstanceInput, InstanceUpdate } from "@/lib/schemas";
import type { AuthMode, InstanceRow, InstanceSummary } from "@/lib/types";

interface DbRow {
  id: string;
  name: string;
  console_url: string;
  mcp_url: string;
  auth_mode: string;
  tool_name: string | null;
  tool_args: string | null;
  tenant_id: string | null;
  console_build_hash: string | null;
  position: number;
  username_enc: string;
  password_enc: string;
  api_key_enc: string;
  created_at: string;
  updated_at: string;
}

const toRow = (row: DbRow): InstanceRow => ({
  id: row.id,
  name: row.name,
  consoleUrl: row.console_url,
  mcpUrl: row.mcp_url,
  authMode: (row.auth_mode === "basic" ? "basic" : "bearer") as AuthMode,
  toolName: row.tool_name,
  toolArgs: row.tool_args,
  tenantId: row.tenant_id,
  consoleBuildHash: row.console_build_hash,
  position: row.position,
  usernameEnc: row.username_enc,
  passwordEnc: row.password_enc,
  apiKeyEnc: row.api_key_enc,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Strips every secret before anything reaches the browser. */
export function toSummary(row: InstanceRow): InstanceSummary {
  return {
    id: row.id,
    name: row.name,
    consoleUrl: row.consoleUrl,
    mcpUrl: row.mcpUrl,
    authMode: row.authMode,
    toolName: row.toolName,
    tenantId: row.tenantId,
    consoleBuildHash: row.consoleBuildHash,
    position: row.position,
    username: decryptSecret(row.usernameEnc),
    hasPassword: row.passwordEnc.length > 0,
    hasApiKey: row.apiKeyEnc.length > 0,
  };
}

export function listInstanceRows(): InstanceRow[] {
  const rows = getDb()
    .prepare("SELECT * FROM instances ORDER BY position ASC, created_at ASC")
    .all() as unknown as DbRow[];
  return rows.map(toRow);
}

export function getInstanceRow(id: string): InstanceRow | null {
  const row = getDb().prepare("SELECT * FROM instances WHERE id = ?").get(id) as
    | unknown as DbRow
    | undefined;
  return row ? toRow(row) : null;
}

export function createInstance(input: InstanceInput): InstanceRow {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const next = db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM instances").get() as
    | unknown as { next: number };
  db.prepare(
    `INSERT INTO instances (id, name, console_url, mcp_url, auth_mode, tool_name, tool_args,
       tenant_id, console_build_hash, position, username_enc, password_enc, api_key_enc, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name,
    input.consoleUrl,
    input.mcpUrl,
    input.authMode,
    input.toolName || null,
    input.toolArgs || null,
    input.tenantId || null,
    input.consoleBuildHash || null,
    next.next,
    encryptSecret(input.username),
    encryptSecret(input.password),
    encryptSecret(input.apiKey),
    now,
    now,
  );
  return getInstanceRow(id)!;
}

export function updateInstance(id: string, patch: InstanceUpdate): InstanceRow | null {
  const current = getInstanceRow(id);
  if (!current) return null;
  getDb()
    .prepare(
      `UPDATE instances SET name = ?, console_url = ?, mcp_url = ?, auth_mode = ?, tool_name = ?,
         tool_args = ?, tenant_id = ?, console_build_hash = ?, username_enc = ?, password_enc = ?,
         api_key_enc = ?, updated_at = ? WHERE id = ?`,
    )
    .run(
      patch.name ?? current.name,
      patch.consoleUrl ?? current.consoleUrl,
      patch.mcpUrl ?? current.mcpUrl,
      patch.authMode ?? current.authMode,
      patch.toolName === undefined ? current.toolName : patch.toolName || null,
      patch.toolArgs === undefined ? current.toolArgs : patch.toolArgs || null,
      patch.tenantId === undefined ? current.tenantId : patch.tenantId || null,
      patch.consoleBuildHash === undefined
        ? current.consoleBuildHash
        : patch.consoleBuildHash || null,
      patch.username ? encryptSecret(patch.username) : current.usernameEnc,
      patch.password ? encryptSecret(patch.password) : current.passwordEnc,
      patch.apiKey ? encryptSecret(patch.apiKey) : current.apiKeyEnc,
      new Date().toISOString(),
      id,
    );
  return getInstanceRow(id);
}

export function deleteInstance(id: string): boolean {
  return getDb().prepare("DELETE FROM instances WHERE id = ?").run(id).changes > 0;
}

/** Server-only: decrypts the stored credentials for an outbound MCP call. */
export function readCredentials(row: InstanceRow) {
  return {
    username: decryptSecret(row.usernameEnc),
    password: decryptSecret(row.passwordEnc),
    apiKey: decryptSecret(row.apiKeyEnc),
  };
}
