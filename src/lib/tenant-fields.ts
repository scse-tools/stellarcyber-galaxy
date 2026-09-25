export interface TenantFieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "boolean";
  required?: boolean;
}

/** The tenant fields we let operators set/edit (a practical subset of the API's TenantRequest). */
export const TENANT_FIELDS: TenantFieldDef[] = [
  { key: "cust_name", label: "Tenant name", type: "text", required: true },
  { key: "contact", label: "Contact", type: "text" },
  { key: "contact_email", label: "Contact email", type: "text" },
  { key: "contact_phone", label: "Contact phone", type: "text" },
  { key: "address", label: "Address", type: "text" },
  { key: "info", label: "Info", type: "text" },
  { key: "retention_group", label: "Retention group", type: "text" },
  { key: "ingestion_limit", label: "Ingestion limit", type: "number" },
  { key: "session_timeout", label: "Session timeout", type: "number" },
  { key: "mfa_enabled", label: "MFA enabled", type: "boolean" },
  { key: "tenant_session_override", label: "Session override", type: "boolean" },
];

/**
 * A sanitized sample row for the tenant CSV template: generic contact/PII placeholders, with
 * numeric structural values (ingestion limit, session timeout) taken from an existing tenant.
 */
export function sampleTenantValues(records: Record<string, unknown>[]): Record<string, string> {
  const base = records[0] ?? {};
  const num = (key: string, fallback: number) => {
    const value = Number(base[key]);
    return String(Number.isFinite(value) && value > 0 ? value : fallback);
  };
  return {
    cust_name: "Example Tenant",
    contact: "Jane Doe",
    contact_email: "jane.doe@example.com",
    contact_phone: "+1-555-0100",
    address: "123 Example Ave",
    info: "Onboarding sample",
    retention_group: typeof base.retention_group === "string" ? base.retention_group : "",
    ingestion_limit: num("ingestion_limit", 100),
    session_timeout: num("session_timeout", 3600),
    mfa_enabled: "false",
    tenant_session_override: "false",
  };
}

type FieldValue = string | number | boolean | undefined;

/** Builds the /tenants request body from a values map: known fields only, typed, empties dropped. */
export function buildTenantPayload(values: Record<string, FieldValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of TENANT_FIELDS) {
    const raw = values[field.key];
    if (raw === undefined || raw === "") continue;
    if (field.type === "number") {
      const n = Number(raw);
      if (Number.isFinite(n)) out[field.key] = n;
    } else if (field.type === "boolean") {
      out[field.key] = raw === true || raw === "true";
    } else {
      out[field.key] = String(raw);
    }
  }
  return out;
}
