"use client";

import { useRef } from "react";
import { Pause, Play, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface OnboardingImportToolbarProps {
  templateId: string;
  templateOptions: { value: string; label: string }[];
  onTemplateChange: (value: string) => void;
  onFile: (file: File) => void;
  hasData: boolean;
  running: boolean;
  paused: boolean;
  createDisabled: boolean;
  onCreateAll: () => void;
  onPause: () => void;
  onDeleteBatch: () => void;
}

export function OnboardingImportToolbar({
  templateId,
  templateOptions,
  onTemplateChange,
  onFile,
  hasData,
  running,
  paused,
  createDisabled,
  onCreateAll,
  onPause,
  onDeleteBatch,
}: OnboardingImportToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchableSelect
        value={templateId}
        onChange={onTemplateChange}
        ariaLabel="Template"
        title="The template this CSV was generated from"
        className="w-56 rounded-md border border-sc-border bg-sc-surface px-2 py-1.5 text-sm text-sc-text hover:bg-sc-active"
        options={[{ value: "", label: "Select template…" }, ...templateOptions]}
      />
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      <Button onClick={() => inputRef.current?.click()}>
        <Upload size={15} /> Upload CSV
      </Button>
      {hasData && !running ? (
        <Button variant="primary" onClick={onCreateAll} disabled={createDisabled}>
          <Play size={15} /> {paused ? "Continue" : "Create all"}
        </Button>
      ) : null}
      {running ? (
        <Button onClick={onPause}>
          <Pause size={15} /> Pause
        </Button>
      ) : null}
      {hasData ? (
        <Button onClick={onDeleteBatch} disabled={running}>
          <Trash2 size={15} /> Delete batch
        </Button>
      ) : null}
    </div>
  );
}
