"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  isCustomRangeValid,
  resolveTimeRange,
  toLocalDateTimeValue,
  TIME_PRESETS,
  type TimeRangeSelection,
} from "@/lib/time-range";

interface TimeRangePickerProps {
  value: TimeRangeSelection;
  disabled?: boolean;
  onChange: (selection: TimeRangeSelection) => void;
}

export function TimeRangePicker({ value, disabled, onChange }: TimeRangePickerProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState<TimeRangeSelection>({ preset: "custom" });

  useEffect(() => {
    if (!customOpen) return;
    const active = resolveTimeRange(value);
    setDraft({
      preset: "custom",
      from: value.from ?? toLocalDateTimeValue(active.from),
      to: value.to ?? toLocalDateTimeValue(active.to),
    });
  }, [customOpen, value]);

  const valid = isCustomRangeValid(draft);

  return (
    <>
      <div
        role="group"
        aria-label="Case creation window"
        className="flex flex-wrap items-center gap-1 rounded-lg border border-sc-border bg-sc-surface/70 p-1"
      >
        {TIME_PRESETS.map((preset) => {
          const active = value.preset === preset.id;
          const isCustom = preset.id === "custom";
          return (
            <button
              key={preset.id}
              type="button"
              title={preset.title}
              aria-pressed={active}
              disabled={disabled}
              onClick={() => (isCustom ? setCustomOpen(true) : onChange({ preset: preset.id }))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
                "transition-colors focus-visible:outline-2 focus-visible:outline-offset-1",
                "focus-visible:outline-sc-link disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? "bg-sc-primary text-white"
                  : "text-sc-muted hover:bg-sc-active hover:text-sc-text",
              )}
            >
              {isCustom ? <CalendarClock size={13} /> : null}
              {preset.label}
            </button>
          );
        })}
      </div>

      <Modal
        open={customOpen}
        title="Custom window"
        description="Bounds the from_created_at / to_created_at filter sent to listCases."
        onClose={() => setCustomOpen(false)}
        className="max-w-md"
      >
        <div className="space-y-3">
          <Field label="From">
            <Input
              type="datetime-local"
              value={draft.from ?? ""}
              onChange={(event) => setDraft({ ...draft, from: event.target.value })}
            />
          </Field>
          <Field label="To">
            <Input
              type="datetime-local"
              value={draft.to ?? ""}
              onChange={(event) => setDraft({ ...draft, to: event.target.value })}
            />
          </Field>
          {!valid ? (
            <p className="text-[11px] text-critical">
              Pick both ends of the window, with From earlier than To.
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setCustomOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!valid}
              onClick={() => {
                onChange(draft);
                setCustomOpen(false);
              }}
            >
              Apply window
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
