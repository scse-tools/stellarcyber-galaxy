"use client";

export type Row = Record<string, unknown>;

/** Renders any cell value as a string; objects/arrays become compact JSON. */
export function cellText(value: unknown): string {
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

function csvField(value: unknown): string {
  const text = cellText(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(columns: string[], rows: Row[]): string {
  const lines = [columns.map(csvField).join(",")];
  for (const row of rows) lines.push(columns.map((column) => csvField(row[column])).join(","));
  return lines.join("\r\n");
}

/** Triggers a client-side CSV download. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));

/**
 * Opens a print-ready window with the table and invokes the browser print dialog, from which the
 * user can "Save as PDF". This keeps PDF export dependency-free.
 */
export function printTable(title: string, columns: string[], rows: Row[]): void {
  const head = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns.map((c) => `<td>${escapeHtml(cellText(row[c]))}</td>`).join("")}</tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body{font:11px -apple-system,Segoe UI,Roboto,sans-serif;margin:16px;color:#111}
  h1{font-size:15px;margin:0 0 12px}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #ccc;padding:3px 6px;text-align:left;vertical-align:top;word-break:break-word}
  th{background:#f2f2f2}
  @page{size:landscape;margin:12mm}
</style></head><body>
<h1>${escapeHtml(title)}</h1>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
<script>window.onload=function(){window.print();}</script>
</body></html>`;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
