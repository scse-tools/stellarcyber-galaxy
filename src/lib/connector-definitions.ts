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
  tooltip?: string;
  desc?: string;
  list?: { label?: unknown; value?: unknown }[];
  "available value"?: unknown[];
  children?: RawField[];
}
interface RawDef {
  type?: string;
  category?: string;
  display_name?: string;
  is_collect?: boolean;
  is_respond?: boolean;
  common_fields?: RawField[];
  collect_fields?: RawField[];
}

/** Flattens fields and their nested children into a single ordered list of named fields. */
function flattenFields(list: RawField[] | undefined): RawField[] {
  const out: RawField[] = [];
  for (const field of list ?? []) {
    if (typeof field.field_name === "string") out.push(field);
    if (Array.isArray(field.children)) out.push(...flattenFields(field.children));
  }
  return out;
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
  description?: string;
  /** Choices for select/radio/combobox fields. */
  options?: { label: string; value: string }[];
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
  // Connection/secret fields (common_fields — host, api_key, …) come first, then the collect fields
  // with any nested children flattened in.
  const rawFields = [...flattenFields(def.common_fields), ...flattenFields(def.collect_fields)];
  const seen = new Set<string>();
  const fields: DefinitionField[] = rawFields
    .filter((field): field is RawField & { field_name: string } => {
      if (typeof field.field_name !== "string" || seen.has(field.field_name)) return false;
      seen.add(field.field_name);
      return true;
    })
    .map((field) => {
      const type = field.type ?? "text";
      const description = field.tooltip || field.desc || undefined;
      let options: { label: string; value: string }[] | undefined;
      if (type === "radio" && Array.isArray(field.list)) {
        options = field.list.map((o) => ({ label: String(o.label ?? o.value), value: String(o.value ?? o.label) }));
      } else if ((type === "select" || type === "combobox") && Array.isArray(field["available value"])) {
        options = field["available value"].map((v) => ({ label: String(v), value: String(v) }));
      }
      return {
        fieldName: field.field_name,
        displayName: field.display_name ?? field.field_name,
        type,
        required: field.required === true,
        default: field.default ?? field.default_value ?? (type === "boolean" ? false : ""),
        description,
        options,
      };
    });
  return {
    category,
    type,
    displayName: def.display_name ?? type,
    isCollect: def.is_collect !== false,
    isRespond: def.is_respond === true,
    fields,
  };
}

/** The default connector fields for a definition — the base for building a create payload. */
export function baseFieldsFromDefinition(def: ConnectorDefinition): Record<string, unknown> {
  const conf: Record<string, unknown> = {};
  for (const field of def.fields) conf[field.fieldName] = field.default;
  return {
    type: def.type,
    category: def.category,
    name: "",
    is_collect: def.isCollect,
    is_respond: def.isRespond,
    run_on: "dp",
    filter_list: [],
    advanced_setting: false,
    configuration: JSON.stringify(conf),
  };
}
