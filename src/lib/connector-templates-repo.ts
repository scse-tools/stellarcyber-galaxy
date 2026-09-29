import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import type { ConnectorTemplate, ConnectorTemplateInput } from "@/lib/connector-templates";

interface TemplateRow {
  id: string;
  name: string;
  instance_id: string;
  instance_name: string;
  connector_type: string;
  connector_name: string;
  fields_json: string;
  mutable_json: string;
  include_all_config: number;
  created_at: string;
}

function toTemplate(row: TemplateRow): ConnectorTemplate {
  return {
    id: row.id,
    name: row.name,
    instanceId: row.instance_id,
    instanceName: row.instance_name,
    connectorType: row.connector_type,
    connectorName: row.connector_name,
    fields: JSON.parse(row.fields_json) as Record<string, unknown>,
    mutableFields: JSON.parse(row.mutable_json) as string[],
    includeAllConfig: row.include_all_config === 1,
    createdAt: row.created_at,
  };
}

/** All saved templates, newest first. */
export function listTemplates(): ConnectorTemplate[] {
  const rows = getDb()
    .prepare("SELECT * FROM connector_templates ORDER BY created_at DESC")
    .all() as unknown as TemplateRow[];
  return rows.map(toTemplate);
}

export function createTemplate(input: ConnectorTemplateInput): ConnectorTemplate {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO connector_templates
        (id, name, instance_id, instance_name, connector_type, connector_name, fields_json, mutable_json, include_all_config, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.name,
      input.instanceId,
      input.instanceName,
      input.connectorType,
      input.connectorName,
      JSON.stringify(input.fields),
      JSON.stringify(input.mutableFields),
      input.includeAllConfig ? 1 : 0,
      createdAt,
    );
  return { id, createdAt, ...input };
}

export function getTemplate(id: string): ConnectorTemplate | null {
  const row = getDb()
    .prepare("SELECT * FROM connector_templates WHERE id = ?")
    .get(id) as unknown as TemplateRow | undefined;
  return row ? toTemplate(row) : null;
}

/** Updates a template's name, mutable-field selection, and (optionally) default field values. */
export function updateTemplate(
  id: string,
  patch: { name: string; mutableFields: string[]; fields?: Record<string, unknown> },
): ConnectorTemplate | null {
  const result = patch.fields
    ? getDb()
        .prepare("UPDATE connector_templates SET name = ?, mutable_json = ?, fields_json = ? WHERE id = ?")
        .run(patch.name, JSON.stringify(patch.mutableFields), JSON.stringify(patch.fields), id)
    : getDb()
        .prepare("UPDATE connector_templates SET name = ?, mutable_json = ? WHERE id = ?")
        .run(patch.name, JSON.stringify(patch.mutableFields), id);
  if (!result.changes) return null;
  return getTemplate(id);
}

export function deleteTemplate(id: string): void {
  getDb().prepare("DELETE FROM connector_templates WHERE id = ?").run(id);
}
