import { getDb } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { SOURCE_CATALOG } from "@/lib/investigation/ti-catalog";
import type { TiSource } from "@/lib/investigation/types";

interface SourceRow {
  key: string;
  name: string;
  api_key_enc: string | null;
  enabled: number;
  config_json: string | null;
  updated_at: string;
}

function rowFor(key: string): SourceRow | null {
  return (getDb().prepare("SELECT * FROM ti_sources WHERE key = ?").get(key) as unknown as SourceRow) ?? null;
}

/** The full source catalog, merged with any stored key/enabled state. */
export function listSources(): TiSource[] {
  const rows = getDb().prepare("SELECT * FROM ti_sources").all() as unknown as SourceRow[];
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return SOURCE_CATALOG.map((def) => {
    const row = byKey.get(def.key);
    return {
      key: def.key,
      name: def.name,
      enabled: row ? row.enabled === 1 : false,
      hasKey: Boolean(row?.api_key_enc),
      updatedAt: row?.updated_at ?? null,
    };
  });
}

/** Server-only: sources that are enabled and hold an API key, with the decrypted key. */
export function listActiveSources(): { key: string; apiKey: string }[] {
  const rows = getDb()
    .prepare("SELECT * FROM ti_sources WHERE enabled = 1 AND api_key_enc IS NOT NULL AND length(api_key_enc) > 0")
    .all() as unknown as SourceRow[];
  return rows.map((row) => ({ key: row.key, apiKey: decryptSecret(row.api_key_enc!) }));
}

export interface SourceUpdate {
  enabled?: boolean;
  apiKey?: string;
  /** Explicit request to remove the stored key. */
  clearKey?: boolean;
}

export function upsertSource(key: string, update: SourceUpdate): void {
  const def = SOURCE_CATALOG.find((source) => source.key === key);
  if (!def) throw new Error(`Unknown threat-intel source: ${key}`);
  const existing = rowFor(key);
  const now = new Date().toISOString();
  const apiKeyEnc = update.clearKey
    ? null
    : update.apiKey
      ? encryptSecret(update.apiKey)
      : (existing?.api_key_enc ?? null);
  const enabled = update.enabled === undefined ? (existing?.enabled ?? 0) : update.enabled ? 1 : 0;

  if (existing) {
    getDb()
      .prepare("UPDATE ti_sources SET name = ?, api_key_enc = ?, enabled = ?, updated_at = ? WHERE key = ?")
      .run(def.name, apiKeyEnc, enabled, now, key);
  } else {
    getDb()
      .prepare("INSERT INTO ti_sources (key, name, api_key_enc, enabled, config_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(key, def.name, apiKeyEnc, enabled, null, now);
  }
}
