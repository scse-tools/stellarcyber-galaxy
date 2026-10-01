import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import type { LlmProvider, LlmProviderInput, ProviderKind } from "@/lib/investigation/types";

interface ProviderRow {
  id: string;
  name: string;
  kind: string;
  model: string;
  base_url: string | null;
  api_key_enc: string;
  enabled: number;
  is_default: number;
  created_at: string;
  updated_at: string;
}

function toProvider(row: ProviderRow): LlmProvider {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as ProviderKind,
    model: row.model,
    baseUrl: row.base_url,
    enabled: row.enabled === 1,
    isDefault: row.is_default === 1,
    hasKey: Boolean(row.api_key_enc),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listProviders(): LlmProvider[] {
  const rows = getDb()
    .prepare("SELECT * FROM llm_providers ORDER BY is_default DESC, name")
    .all() as unknown as ProviderRow[];
  return rows.map(toProvider);
}

function getRow(id: string): ProviderRow | null {
  return (getDb().prepare("SELECT * FROM llm_providers WHERE id = ?").get(id) as unknown as ProviderRow) ?? null;
}

export function getProvider(id: string): LlmProvider | null {
  const row = getRow(id);
  return row ? toProvider(row) : null;
}

/** Server-only: the decrypted API key for making a provider call. */
export function getProviderApiKey(id: string): string | null {
  const row = getRow(id);
  if (!row?.api_key_enc) return null;
  return decryptSecret(row.api_key_enc);
}

function clearDefault(): void {
  getDb().prepare("UPDATE llm_providers SET is_default = 0").run();
}

export function createProvider(input: LlmProviderInput): LlmProvider {
  const id = randomUUID();
  const now = new Date().toISOString();
  if (input.isDefault) clearDefault();
  getDb()
    .prepare(
      `INSERT INTO llm_providers (id, name, kind, model, base_url, api_key_enc, enabled, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.name,
      input.kind,
      input.model,
      input.baseUrl ?? null,
      input.apiKey ? encryptSecret(input.apiKey) : "",
      input.enabled === false ? 0 : 1,
      input.isDefault ? 1 : 0,
      now,
      now,
    );
  return getProvider(id)!;
}

export function updateProvider(id: string, input: LlmProviderInput): LlmProvider | null {
  const existing = getRow(id);
  if (!existing) return null;
  if (input.isDefault) clearDefault();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE llm_providers
         SET name = ?, kind = ?, model = ?, base_url = ?, api_key_enc = ?, enabled = ?, is_default = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.name,
      input.kind,
      input.model,
      input.baseUrl ?? null,
      // Keep the stored key unless a new one is supplied.
      input.apiKey ? encryptSecret(input.apiKey) : existing.api_key_enc,
      input.enabled === false ? 0 : 1,
      input.isDefault ? 1 : 0,
      now,
      id,
    );
  return getProvider(id);
}

export function deleteProvider(id: string): void {
  getDb().prepare("DELETE FROM llm_providers WHERE id = ?").run(id);
}
