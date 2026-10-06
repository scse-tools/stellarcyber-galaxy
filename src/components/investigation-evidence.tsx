"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, Sparkles, StickyNote, Trash2 } from "lucide-react";
import { RichText } from "@/components/rich-text";
import type { Evidence } from "@/lib/investigation/types";

interface Props {
  evidence: Evidence[];
  busy: boolean;
  onAdd: (type: Evidence["type"], payload: { content?: string; url?: string }) => Promise<void>;
  onDelete: (id: string) => void;
}

export function InvestigationEvidence({ evidence, busy, onAdd, onDelete }: Props) {
  const [note, setNote] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addNote = async () => {
    if (!note.trim()) return;
    await onAdd("note", { content: note.trim() });
    setNote("");
  };
  const addLink = async () => {
    if (!linkUrl.trim()) return;
    await onAdd("link", { url: linkUrl.trim(), content: linkLabel.trim() || undefined });
    setLinkUrl("");
    setLinkLabel("");
  };
  const addScreenshot = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => void onAdd("screenshot", { content: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = Array.from(event.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (file) addScreenshot(file);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-lg border border-sc-border-soft bg-sc-surface px-2.5 py-2">
        <div className="flex items-start gap-1.5">
          <StickyNote size={13} className="mt-1.5 shrink-0 text-sc-faint" />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note…"
            rows={2}
            className="min-w-0 flex-1 resize-y rounded border border-sc-border bg-sc-surface px-2 py-1 text-xs text-sc-text placeholder:text-sc-faint focus:border-sc-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void addNote()}
            disabled={busy || !note.trim()}
            className="rounded bg-sc-primary px-2 py-1 text-[11px] font-medium text-white disabled:opacity-40"
          >
            Add
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <Link2 size={13} className="shrink-0 text-sc-faint" />
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…"
            className="min-w-0 flex-1 rounded border border-sc-border bg-sc-surface px-2 py-1 text-xs text-sc-text placeholder:text-sc-faint focus:border-sc-primary focus:outline-none"
          />
          <input
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="label"
            className="w-20 rounded border border-sc-border bg-sc-surface px-2 py-1 text-xs text-sc-text placeholder:text-sc-faint focus:border-sc-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void addLink()}
            disabled={busy || !linkUrl.trim()}
            className="rounded bg-sc-primary px-2 py-1 text-[11px] font-medium text-white disabled:opacity-40"
          >
            Add
          </button>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) addScreenshot(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            disabled={busy}
            className={`flex w-full items-center justify-center gap-1.5 rounded border border-dashed px-2 py-2 text-[11px] transition-colors disabled:opacity-40 ${
              dragging
                ? "border-sc-primary bg-sc-primary/10 text-sc-text"
                : "border-sc-border text-sc-muted hover:bg-sc-active hover:text-sc-text"
            }`}
          >
            <ImagePlus size={13} />
            {dragging ? "Drop image to attach" : "Attach screenshot — click or drag & drop"}
          </button>
        </div>
      </div>

      {evidence.length === 0 ? (
        <p className="px-1 text-[11px] text-sc-faint">No evidence attached yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {evidence.map((item) => (
            <li key={item.id} className="group rounded-lg border border-sc-border-soft bg-sc-surface px-2.5 py-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {item.type === "analysis" ? (
                    <div>
                      <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-sc-accent">
                        <Sparkles size={11} /> AI analysis
                      </p>
                      <RichText text={item.content ?? ""} />
                    </div>
                  ) : item.type === "note" ? (
                    <p className="whitespace-pre-wrap text-[11px] text-sc-text">{item.content}</p>
                  ) : item.type === "link" ? (
                    <a
                      href={item.url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-[11px] text-sc-link hover:underline"
                    >
                      {item.content || item.url}
                    </a>
                  ) : item.content ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.content} alt="Evidence screenshot" className="max-h-40 rounded border border-sc-border-soft" />
                  ) : null}
                  <p className="mt-0.5 text-[9px] text-sc-faint">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  aria-label="Delete evidence"
                  className="shrink-0 text-sc-faint opacity-0 transition-opacity hover:text-critical group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
