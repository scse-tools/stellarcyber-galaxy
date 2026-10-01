import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { SOURCE_CATALOG } from "@/lib/investigation/ti-catalog";
import type { CustomSourceConfig } from "@/lib/investigation/ti-fetch";
import type { CustomSourceInput, TiSource } from "@/lib/investigation/types";
import type { ObservableKind } from "@/lib/observables";

interface SourceRow {
  key: string;
  name: string;
  api_key_enc: string | null;
  enabled: number;
  config_json: string | null;
  updated_at: string;
}

interface CustomConfig {
  tier: "custom";
  name: string;
  kinds: ObservableKind[];
  urlTemplate: string;
  authHeader: string | null;
}

const isCustom = (row: SourceRow): CustomConfig | null => {
  if (!row.config_json) return null;
  try {
    const parsed = JSON.parse(row.config_json) as CustomConfig;
    return parsed?.tier === "custom" ? parsed : null;
  } catch {
    return null;
  }
};

function allRows(): Map<string, SourceRow> {
  const rows = getDb().prepare("SELECT * FROM ti_sources").all() as unknown as SourceRow[];
  return new Map(rows.map((row) => [row.key, row]));
}

/** The full source list for the UI: built-in keyless/premium sources merged with stored state, plus custom sources. */
export function listSources(): TiSource[] {
  const rows = allRows();
  const builtins: TiSource[] = SOURCE_CATALOG.map((def) => {
    const row = rows.get(def.key);
    return {
      key: def.key,
      name: def.name,
      tier: def.tier,
      kinds: def.kinds,
      // Keyless sources are on by default; premium ones are off until a key is added.
      enabled: row ? row.enabled === 1 : def.tier === "keyless",
      hasKey: Boolean(row?.api_key_enc),
      homepage: def.homepage,
      updatedAt: row?.updated_at ?? null,
    };
  });
  const custom: TiSource[] = [];
  for (const row of rows.values()) {
    const config = isCustom(row);
    if (!config) continue;
    custom.push({
      key: row.key,
      name: config.name,
      tier: "custom",
      kinds: config.kinds,
      enabled: row.enabled === 1,
      hasKey: Boolean(row.api_key_enc),
      urlTemplate: config.urlTemplate,
      authHeader: config.authHeader,
      updatedAt: row.updated_at,
    });
  }
  return [...builtins, ...custom];
}

export interface ActiveSource {
  key: string;
  name: string;
  kinds: ObservableKind[];
  apiKey: string | null;
  custom?: CustomSourceConfig;
}

/** Server-only: every source that should run for an investigation right now. */
export function listActiveSources(): ActiveSource[] {
  const rows = allRows();
  const active: ActiveSource[] = [];

  for (const def of SOURCE_CATALOG) {
    const row = rows.get(def.key);
    const enabled = row ? row.enabled === 1 : def.tier === "keyless";
    if (!enabled) continue;
    if (def.tier === "premium" && !row?.api_key_enc) continue; // premium needs a key
    active.push({
      key: def.key,
      name: def.name,
      kinds: def.kinds,
      apiKey: row?.api_key_enc ? decryptSecret(row.api_key_enc) : null,
    });
  }

  for (const row of rows.values()) {
    const config = isCustom(row);
    if (!config || row.enabled !== 1 || !row.api_key_enc) continue;
    active.push({
      key: row.key,
      name: config.name,
      kinds: config.kinds,
      apiKey: decryptSecret(row.api_key_enc),
      custom: { urlTemplate: config.urlTemplate, authHeader: config.authHeader },
    });
  }
  return active;
}

/** Server-only: resolve one source's runtime (config + key) for a connectivity test, ignoring enabled state. */
export function getSourceRuntime(key: string): ActiveSource | null {
  const row = allRows().get(key);
  const def = SOURCE_CATALOG.find((source) => source.key === key);
  if (def) {
    return {
      key: def.key,
      name: def.name,
      kinds: def.kinds,
      apiKey: row?.api_key_enc ? decryptSecret(row.api_key_enc) : null,
    };
  }
  const config = row ? isCustom(row) : null;
  if (!config || !row) return null;
  return {
    key: row.key,
    name: config.name,
    kinds: config.kinds,
    apiKey: row.api_key_enc ? decryptSecret(row.api_key_enc) : null,
    custom: { urlTemplate: config.urlTemplate, authHeader: config.authHeader },
  };
}

export interface SourceUpdate {
  enabled?: boolean;
  apiKey?: string;
  clearKey?: boolean;
}

/** Enable/disable a built-in source or set its key. */
export function upsertSource(key: string, update: SourceUpdate): void {
  const def = SOURCE_CATALOG.find((source) => source.key === key);
  const existing = allRows().get(key);
  if (!def && !isCustom(existing ?? ({} as SourceRow))) throw new Error(`Unknown source: ${key}`);
  const now = new Date().toISOString();
  const apiKeyEnc = update.clearKey ? null : update.apiKey ? encryptSecret(update.apiKey) : (existing?.api_key_enc ?? null);
  const enabled = update.enabled === undefined ? (existing?.enabled ?? (def?.tier === "keyless" ? 1 : 0)) : update.enabled ? 1 : 0;
  const name = def?.name ?? existing?.name ?? key;

  if (existing) {
    getDb().prepare("UPDATE ti_sources SET name = ?, api_key_enc = ?, enabled = ?, updated_at = ? WHERE key = ?").run(name, apiKeyEnc, enabled, now, key);
  } else {
    getDb()
      .prepare("INSERT INTO ti_sources (key, name, api_key_enc, enabled, config_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(key, name, apiKeyEnc, enabled, null, now);
  }
}

/** Create a user-defined premium source. */
export function createCustomSource(input: CustomSourceInput): void {
  if (!input.urlTemplate.includes("{value}")) throw new Error("URL template must contain {value}.");
  const key = `custom_${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const config: CustomConfig = {
    tier: "custom",
    name: input.name,
    kinds: input.kinds,
    urlTemplate: input.urlTemplate,
    authHeader: input.authHeader ?? null,
  };
  getDb()
    .prepare("INSERT INTO ti_sources (key, name, api_key_enc, enabled, config_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(key, input.name, input.apiKey ? encryptSecret(input.apiKey) : null, input.enabled === false ? 0 : 1, JSON.stringify(config), now);
}

export function deleteSource(key: string): void {
  getDb().prepare("DELETE FROM ti_sources WHERE key = ?").run(key);
}
