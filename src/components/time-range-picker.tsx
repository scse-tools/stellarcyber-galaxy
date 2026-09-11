"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  isCustomRangeValid,
  isSinceValid,
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

type Tab = "range" | "since";

export function TimeRangePicker({ value, disabled, onChange }: TimeRangePickerProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("range");
  const [range, setRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [since, setSince] = useState("");

  // Seed both tabs from the active window whenever the modal opens.
  useEffect(() => {
    if (!customOpen) return;
    const active = resolveTimeRange(value);
    const fromLocal = value.from ?? toLocalDateTimeValue(active.from);
    setTab(value.preset === "since" ? "since" : "range");
    setRange({ from: fromLocal, to: value.to ?? toLocalDateTimeValue(active.to) });
    setSince(fromLocal);
  }, [customOpen, value]);

  const customActive = value.preset === "custom" || value.preset === "since";
  const rangeValid = isCustomRangeValid({ preset: "custom", from: range.from, to: range.to });
  const sinceValid = isSinceValid({ preset: "since", from: since });

  const apply = () => {
    if (tab === "range") onChange({ preset: "custom", from: range.from, to: range.to });
    else onChange({ preset: "since", from: since });
    setCustomOpen(false);
  };

  return (
    <>
      <div
        role="group"
        aria-label="Case creation window"
        className="flex flex-wrap items-center gap-1 rounded-lg border border-sc-border bg-sc-surface/70 p-1"
      >
        {TIME_PRESETS.map((preset) => {
          const isCustom = preset.id === "custom";
          const active = isCustom ? customActive : value.preset === preset.id;
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
        <div className="mb-4 flex gap-1 rounded-lg border border-sc-border bg-sc-surface/70 p-1">
          {(["range", "since"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === id
                  ? "bg-sc-primary text-white"
                  : "text-sc-muted hover:bg-sc-active hover:text-sc-text",
              )}
            >
              {id === "range" ? "Range (from / to)" : "Since (to now)"}
            </button>
          ))}
        </div>

        {tab === "range" ? (
          <div className="space-y-3">
            <Field label="From">
              <Input
                type="datetime-local"
                value={range.from}
                onChange={(event) => setRange({ ...range, from: event.target.value })}
              />
            </Field>
            <Field label="To">
              <Input
                type="datetime-local"
                value={range.to}
                onChange={(event) => setRange({ ...range, to: event.target.value })}
              />
            </Field>
            {!rangeValid ? (
              <p className="text-[11px] text-critical">
                Pick both ends of the window, with From earlier than To.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Since" hint="The window runs from this start to a dynamic “now.”">
              <Input
                type="datetime-local"
                value={since}
                onChange={(event) => setSince(event.target.value)}
              />
            </Field>
            {!sinceValid ? (
              <p className="text-[11px] text-critical">Pick a start time in the past.</p>
            ) : null}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={() => setCustomOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={tab === "range" ? !rangeValid : !sinceValid}
            onClick={apply}
          >
            Apply window
          </Button>
        </div>
      </Modal>
    </>
  );
}
