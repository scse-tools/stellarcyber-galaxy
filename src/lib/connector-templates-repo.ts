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
        (id, name, instance_id, instance_name, connector_type, connector_name, fields_json, mutable_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      createdAt,
    );
  return { id, createdAt, ...input };
}

export function deleteTemplate(id: string): void {
  getDb().prepare("DELETE FROM connector_templates WHERE id = ?").run(id);
}
