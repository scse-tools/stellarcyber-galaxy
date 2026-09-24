"use client";

import { Download, Pencil, Trash2 } from "lucide-react";
import { downloadCsv } from "@/lib/table-export";
import { formatRelativeTime } from "@/lib/utils";
import { templateCsv, type ConnectorTemplate } from "@/lib/connector-templates";

interface StudioTemplatesTableProps {
  templates: ConnectorTemplate[];
  canManage: boolean;
  onEdit: (template: ConnectorTemplate) => void;
  onDelete: (template: ConnectorTemplate) => void;
}

/** Saved connector templates, with a per-row clone-CSV download and delete. */
export function StudioTemplatesTable({ templates, canManage, onEdit, onDelete }: StudioTemplatesTableProps) {
  const download = (template: ConnectorTemplate) => {
    const file = `${template.name}-clone-template`.replace(/\s+/g, "_");
    downloadCsv(`${file}.csv`, templateCsv(template));
  };

  return (
    <div className="rounded-lg border border-sc-border-soft">
      <div className="border-b border-sc-border-soft px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-sc-faint">
        Templates
      </div>
      {templates.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-sc-faint">
          Please create a template from an existing connector.
        </p>
      ) : (
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-sc-faint">
            <th className="px-3 py-1.5 font-medium">Name</th>
            <th className="px-3 py-1.5 font-medium">Server</th>
            <th className="px-3 py-1.5 font-medium">Type</th>
            <th className="px-3 py-1.5 font-medium">Mutable fields</th>
            <th className="px-3 py-1.5 font-medium">Created</th>
            <th className="px-3 py-1.5 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((template) => (
            <tr key={template.id} className="border-t border-sc-border-soft odd:bg-sc-surface/40">
              <td className="px-3 py-1.5 font-medium text-sc-text">{template.name}</td>
              <td className="px-3 py-1.5 text-sc-muted">{template.instanceName}</td>
              <td className="px-3 py-1.5 text-sc-muted">{template.connectorType}</td>
              <td className="px-3 py-1.5 text-sc-muted" title={template.mutableFields.join(", ")}>
                {template.mutableFields.length}
              </td>
              <td className="px-3 py-1.5 text-sc-faint">{formatRelativeTime(template.createdAt)}</td>
              <td className="px-3 py-1.5">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => download(template)}
                    title="Download clone CSV"
                    className="inline-flex items-center gap-1 rounded p-1 text-sc-faint hover:bg-sc-active hover:text-sc-text"
                  >
                    <Download size={14} /> CSV
                  </button>
                  {canManage ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onEdit(template)}
                        title="Edit template"
                        className="rounded p-1 text-sc-faint hover:bg-sc-active hover:text-sc-text"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(template)}
                        title="Delete template"
                        className="rounded p-1 text-sc-faint hover:bg-sc-active hover:text-critical"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  );
}
