"use client";

import { Field, Input } from "@/components/ui/field";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Tenant } from "@/lib/types";

export interface InstanceFormValues {
  name: string;
  consoleUrl: string;
  apiKey: string;
  tenantId: string;
  toolName: string;
  toolArgs: string;
}

interface InstanceFormFieldsProps {
  values: InstanceFormValues;
  editing: boolean;
  tenants: Tenant[];
  tenantsLoading?: boolean;
  onChange: (key: keyof InstanceFormValues, value: string) => void;
}

export function InstanceFormFields({
  values,
  editing,
  tenants,
  tenantsLoading,
  onChange,
}: InstanceFormFieldsProps) {
  const bind = (key: keyof InstanceFormValues) => ({
    value: values[key],
    onChange: (event: { target: { value: string } }) => onChange(key, event.target.value),
  });

  return (
    <>
      <Field label="Display name">
        <Input {...bind("name")} required />
      </Field>
      <Field
        label="Server URL"
        hint="Base console URL. The MCP endpoint is derived automatically as <server>/mcp."
      >
        <Input type="url" placeholder="https://coe.stellarcyber.cloud" {...bind("consoleUrl")} required />
      </Field>
      <Field
        label="API key (bearer token)"
        hint={
          editing
            ? "Blank keeps the stored key. Exchanged for an access token on MCP and REST."
            : "Exchanged for an access token on both the MCP and REST endpoints."
        }
      >
        <Input type="password" autoComplete="off" {...bind("apiKey")} required={!editing} />
      </Field>
      <Field
        label="Lock to tenant"
        hint={
          tenantsLoading
            ? "Loading tenants…"
            : tenants.length > 0
              ? "All tenants = no tenant filter; the tile picker stays enabled. Lock to scope this tile to one tenant."
              : "Enter an API key and run Test connection to list tenants."
        }
      >
        <SearchableSelect
          value={values.tenantId}
          disabled={tenants.length === 0}
          ariaLabel="Lock to tenant"
          className="w-full rounded-md border border-sc-border bg-sc-bg px-3 py-2 text-sm text-sc-text"
          onChange={(value) => onChange("tenantId", value)}
          options={[
            { value: "", label: "All tenants" },
            // Keep a locked value visible even before the list loads.
            ...(values.tenantId && !tenants.some((t) => t.id === values.tenantId)
              ? [{ value: values.tenantId, label: values.tenantId }]
              : []),
            ...tenants.map((tenant) => ({ value: tenant.id, label: tenant.name })),
          ]}
        />
      </Field>
      <details className="rounded-md border border-sc-border-soft px-3 py-2">
        <summary className="cursor-pointer text-xs text-sc-muted">Advanced tool override</summary>
        <div className="mt-3 space-y-3">
          <Field label="Case tool name" hint="Leave blank to use listCases.">
            <Input {...bind("toolName")} placeholder="listCases" />
          </Field>
          <Field label="Extra tool arguments (JSON)" hint='e.g. {"status":"New"}'>
            <Input {...bind("toolArgs")} />
          </Field>
        </div>
      </details>
    </>
  );
}
