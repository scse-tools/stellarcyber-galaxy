"use client";

import { FieldInput, type FieldValue } from "@/components/catalog-field-input";
import type { DefinitionField } from "@/lib/connector-definitions";

/** A labelled group of catalog fields, each with a mutable checkbox, description and value input. */
export function CatalogTemplateSection({
  title,
  fields,
  prefix,
  values,
  onValue,
}: {
  title: string;
  fields: DefinitionField[];
  prefix: string;
  values: Record<string, FieldValue>;
  onValue: (key: string, value: FieldValue) => void;
}) {
  if (fields.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-sc-faint">{title}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {fields.map((field) => {
          const key = `${prefix}${field.fieldName}`;
          return (
            <div key={key} className="rounded-md border border-sc-border-soft px-3 py-2">
              <div className="flex items-baseline gap-2 text-[11px]">
                <span className="font-medium text-sc-text">{field.displayName}</span>
                {field.required ? <span className="text-critical">*</span> : null}
                <span className="ml-auto truncate font-mono text-[10px] text-sc-faint">{field.fieldName}</span>
              </div>
              {field.description ? <p className="mt-0.5 text-[10px] leading-snug text-sc-faint">{field.description}</p> : null}
              <div className="mt-1.5">
                <FieldInput field={field} value={values[key]} onChange={(v) => onValue(key, v)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
