"use client";

import { useRef } from "react";
import { Pause, Play, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingImportToolbarProps {
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
