/** A saved connector "template": a snapshot of one connector plus which fields are cloneable. */
export interface ConnectorTemplate {
  id: string;
  name: string;
  instanceId: string;
  instanceName: string;
  connectorType: string;
  connectorName: string;
  /** Full field snapshot of the source connector at capture time. */
  fields: Record<string, unknown>;
  /** Field keys the operator marked mutable — the columns a clone CSV will carry. */
  mutableFields: string[];
  createdAt: string;
}

export type ConnectorTemplateInput = Omit<ConnectorTemplate, "id" | "createdAt">;

/**
 * Fields that vary per tenant or hold secrets, defaulted to mutable when building a template.
 * `tenantid` is always cloneable since each clone targets a different tenant.
 */
const MUTABLE_HINT =
  /(url|host|endpoint|user|username|password|secret|token|api[_-]?key|apikey|credential|tenant|account|client[_-]?id|region|domain|site)/i;

export function defaultMutable(field: string): boolean {
  return MUTABLE_HINT.test(field);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Resolves a (possibly nested) template field. A `configuration.<sub>` key reads a sub-field of the
 * connector's `configuration` JSON; any other key is read from the top-level snapshot.
 */
export function readTemplateField(fields: Record<string, unknown>, key: string): unknown {
  const prefix = "configuration.";
  if (key.startsWith(prefix)) {
    const sub = key.slice(prefix.length);
    const raw = fields.configuration;
    const config = typeof raw === "string" ? safeParse(raw) : raw;
    return isRecord(config) ? config[sub] : undefined;
  }
  return fields[key];
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Renders any field value as flat text for CSV/export (objects become compact JSON). */
function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Columns for a template's clone CSV: the required tenant name plus each mutable field. */
export function templateColumns(template: ConnectorTemplate): string[] {
  return ["tenant_name", ...template.mutableFields];
}

function csvField(text: string): string {
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * The clone CSV for a template: a header row of tenant_name + mutable fields, and one sample row
 * pre-filled from the source connector's current values (tenant_name left blank to fill in).
 */
export function templateCsv(template: ConnectorTemplate): string {
  const columns = templateColumns(template);
  const sample = columns.map((column) =>
    column === "tenant_name" ? "" : asText(readTemplateField(template.fields, column)),
  );
  return [columns.map(csvField).join(","), sample.map(csvField).join(",")].join("\r\n");
}
