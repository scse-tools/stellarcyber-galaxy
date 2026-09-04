"use client";

import { Field, Input, Select } from "@/components/ui/field";
import type { AuthMode } from "@/lib/types";

export interface InstanceFormValues {
  name: string;
  consoleUrl: string;
  mcpUrl: string;
  authMode: AuthMode;
  username: string;
  password: string;
  apiKey: string;
  tenantId: string;
  consoleBuildHash: string;
  toolName: string;
  toolArgs: string;
}

interface InstanceFormFieldsProps {
  values: InstanceFormValues;
  editing: boolean;
  onChange: (key: keyof InstanceFormValues, value: string) => void;
}

export function InstanceFormFields({ values, editing, onChange }: InstanceFormFieldsProps) {
  const bind = (key: keyof InstanceFormValues) => ({
    value: values[key],
    onChange: (event: { target: { value: string } }) => onChange(key, event.target.value),
  });

  return (
    <>
      <Field label="Display name">
        <Input {...bind("name")} required />
      </Field>
      <Field label="Console URL" hint="Where the tile's modal sends you.">
        <Input type="url" placeholder="https://salesdemo.stellarcyber.cloud" {...bind("consoleUrl")} required />
      </Field>
      <Field label="MCP endpoint" hint="Streamable HTTP or SSE URL of this instance's MCP server.">
        <Input type="url" placeholder="https://salesdemo.stellarcyber.cloud/mcp" {...bind("mcpUrl")} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Auth mode">
          <Select {...bind("authMode")}>
            <option value="bearer">Bearer token (API key)</option>
            <option value="basic">Basic (user + password)</option>
          </Select>
        </Field>
        <Field label="Tenant ID" hint="Optional">
          <Input {...bind("tenantId")} />
        </Field>
      </div>
      <Field label="Username">
        <Input {...bind("username")} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Password" hint={editing ? "Blank keeps current" : undefined}>
          <Input type="password" autoComplete="new-password" {...bind("password")} required={!editing} />
        </Field>
        <Field
          label="Bearer token / API key"
          hint={editing ? "Blank keeps current" : "Exchanged via get_access_token"}
        >
          <Input type="password" autoComplete="off" {...bind("apiKey")} required={!editing} />
        </Field>
      </div>
      <details className="rounded-md border border-sc-border-soft px-3 py-2">
        <summary className="cursor-pointer text-xs text-sc-muted">Advanced tool override</summary>
        <div className="mt-3 space-y-3">
          <Field label="Case tool name" hint="Leave blank to use listCases.">
            <Input {...bind("toolName")} placeholder="listCases" />
          </Field>
          <Field label="Extra tool arguments (JSON)" hint='e.g. {"status":"New"}'>
            <Input {...bind("toolArgs")} />
          </Field>
          <Field
            label="Console login build hash"
            hint="Hex string for console auto-login. Blank = auto-discover."
          >
            <Input {...bind("consoleBuildHash")} placeholder="auto" />
          </Field>
        </div>
      </details>
    </>
  );
}
