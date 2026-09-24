"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { cellText, type Row } from "@/lib/table-export";

/** Top-level connector fields that may be marked mutable. */
export const SELECTABLE_TOP = ["filter_list", "name", "run_on"];

interface TemplateFieldPickerProps {
  connector: Row;
  /** Parsed configuration sub-fields present on the source connector. */
  configEntries: [string, unknown][];
  /** Custom configuration sub-fields the operator added (not on the source connector). */
  added: string[];
  isMutable: (key: string, hint?: string) => boolean;
  onToggle: (key: string, hint?: string) => void;
  onAddField: (name: string) => void;
  onRemoveField: (sub: string) => void;
  open: boolean;
  onToggleOpen: () => void;
}

/** The mutable-field selector: the three top-level fields plus the expandable configuration list. */
export function TemplateFieldPicker({
  connector,
  configEntries,
  added,
  isMutable,
  onToggle,
  onAddField,
  onRemoveField,
  open,
  onToggleOpen,
}: TemplateFieldPickerProps) {
  const [newField, setNewField] = useState("");
  const addNow = () => {
    const key = newField.trim();
    if (!key) return;
    onAddField(key);
    setNewField("");
  };

  return (
    <div className="mt-2 max-h-[48vh] overflow-y-auto rounded-lg border border-sc-border-soft">
      {SELECTABLE_TOP.map((key) => (
        <FieldRow key={key} label={key} value={cellText(connector[key])} checked={isMutable(key)} onToggle={() => onToggle(key)} />
      ))}

      <div className="border-t border-sc-border-soft">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex w-full items-center gap-1.5 bg-sc-raised/40 px-3 py-1.5 text-left text-[11px] font-medium text-sc-muted hover:text-sc-text"
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          configuration
          <span className="text-sc-faint">({configEntries.length + added.length} fields)</span>
        </button>
        {open ? (
          <>
            {configEntries.map(([sub, value]) => (
              <FieldRow
                key={sub}
                label={sub}
                value={cellText(value)}
                checked={isMutable(`configuration.${sub}`, sub)}
                onToggle={() => onToggle(`configuration.${sub}`, sub)}
                indent
              />
            ))}
            {added.map((sub) => (
              <FieldRow
                key={sub}
                label={sub}
                value=""
                checked={isMutable(`configuration.${sub}`, sub)}
                onToggle={() => onToggle(`configuration.${sub}`, sub)}
                onRemove={() => onRemoveField(sub)}
                indent
              />
            ))}
            <div className="flex items-center gap-2 py-1.5 pl-8 pr-3">
              <input
                value={newField}
                onChange={(event) => setNewField(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addNow())}
                placeholder="Add a configuration field (e.g. api_key)"
                className="min-w-0 flex-1 rounded border border-sc-border-soft bg-sc-surface px-2 py-1 text-[11px] text-sc-text placeholder:text-sc-faint focus:border-sc-link focus:outline-none"
              />
              <button
                type="button"
                onClick={addNow}
                disabled={!newField.trim()}
                className="inline-flex items-center gap-1 rounded border border-sc-border bg-sc-raised px-2 py-1 text-[11px] font-medium text-sc-text hover:border-sc-link disabled:opacity-50"
              >
                <Plus size={12} /> Add
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  checked,
  onToggle,
  indent,
  onRemove,
}: {
  label: string;
  value: string;
  checked: boolean;
  onToggle: () => void;
  indent?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-3 py-1.5 text-[11px] hover:bg-sc-active/50", indent && "pl-8")}>
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <input type="checkbox" checked={checked} onChange={onToggle} className="accent-sc-primary" />
        <span className="w-44 shrink-0 truncate text-sc-muted">{label}</span>
        <span className="min-w-0 flex-1 truncate text-right text-sc-text" title={value}>
          {value || "—"}
        </span>
      </label>
      {onRemove ? (
        <button type="button" onClick={onRemove} title="Remove field" className="shrink-0 text-sc-faint hover:text-critical">
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
}
