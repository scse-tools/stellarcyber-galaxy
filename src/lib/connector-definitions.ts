// The full connector catalog (data.<category>.<type>) — imported server-side only so the ~540KB
// payload bundles into the API routes rather than the client. Typed loosely to keep tsc fast.
import catalogJson from "@/data/connector-configurations.json";

interface RawField {
  field_name?: string;
  display_name?: string;
  type?: string;
  required?: boolean;
  default?: unknown;
  default_value?: unknown;
}
interface RawDef {
  type?: string;
  category?: string;
  display_name?: string;
  is_collect?: boolean;
  is_respond?: boolean;
  collect_fields?: RawField[];
}

const data = (catalogJson as { data: Record<string, Record<string, RawDef>> }).data;

export interface DefinitionSummary {
  category: string;
  type: string;
  displayName: string;
}
export interface DefinitionField {
  fieldName: string;
  displayName: string;
  type: string;
  required: boolean;
  default: unknown;
}
export interface ConnectorDefinition extends DefinitionSummary {
  isCollect: boolean;
  isRespond: boolean;
  fields: DefinitionField[];
}

/** All connector types in the catalog, sorted by display name. */
export function listConnectorDefinitions(): DefinitionSummary[] {
  const out: DefinitionSummary[] = [];
  for (const category of Object.keys(data)) {
    for (const type of Object.keys(data[category])) {
      out.push({ category, type, displayName: data[category][type].display_name ?? type });
    }
  }
  return out.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
}

/** One connector type's definition with its collect fields (and sensible defaults). */
export function getConnectorDefinition(category: string, type: string): ConnectorDefinition | null {
  const def = data[category]?.[type];
  if (!def) return null;
  const fields: DefinitionField[] = (def.collect_fields ?? [])
    .filter((field): field is RawField & { field_name: string } => typeof field.field_name === "string")
    .map((field) => ({
      fieldName: field.field_name,
      displayName: field.display_name ?? field.field_name,
      type: field.type ?? "text",
      required: field.required === true,
      default: field.default ?? field.default_value ?? (field.type === "boolean" ? false : ""),
    }));
  return {
    category,
    type,
    displayName: def.display_name ?? type,
    isCollect: def.is_collect !== false,
    isRespond: def.is_respond === true,
    fields,
  };
}
