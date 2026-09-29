"use client";

import type { DefinitionField } from "@/lib/connector-definitions";

export type FieldValue = string | boolean;

const inputClass =
  "w-full rounded border border-sc-border-soft bg-sc-surface px-2 py-1 text-[11px] text-sc-text focus:border-sc-link focus:outline-none";

/** Renders the right input for a catalog field type, seeded with its default value. */
export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: DefinitionField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}) {
  if (field.type === "boolean") {
    return (
      <select
        value={value === true ? "true" : "false"}
        onChange={(e) => onChange(e.target.value === "true")}
        className={inputClass}
      >
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );
  }

  if ((field.type === "select" || field.type === "radio") && field.options?.length) {
    return (
      <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">—</option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  const listId = field.options?.length ? `opts-${field.fieldName}` : undefined;
  return (
    <>
      <input
        type={field.type === "number" ? "number" : "text"}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        list={listId}
        placeholder={field.type === "list" ? "JSON array" : field.type === "password" ? "leave blank to set per clone" : ""}
        className={inputClass}
      />
      {listId ? (
        <datalist id={listId}>
          {field.options!.map((option) => (
            <option key={option.value} value={option.value} />
          ))}
        </datalist>
      ) : null}
    </>
  );
}
