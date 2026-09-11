"use client";

import { Modal } from "@/components/ui/modal";
import { APP_VERSION, CHANGELOG } from "@/lib/version";

const DATE = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** Release notes, newest version first (Keep a Changelog / semver convention). */
export function ChangelogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <Modal
      open={open}
      title="Release notes"
      description={`Stellar Cyber Galaxy · current version ${APP_VERSION}`}
      onClose={onClose}
      className="max-w-lg"
    >
      <ol className="space-y-5">
        {CHANGELOG.map((entry) => (
          <li key={entry.version}>
            <div className="flex items-baseline gap-2">
              <h3 className="font-mono text-sm font-semibold text-sc-text">v{entry.version}</h3>
              <span className="text-[11px] text-sc-faint">
                {(() => {
                  const parsed = new Date(entry.date);
                  return Number.isNaN(parsed.getTime()) ? entry.date : DATE.format(parsed);
                })()}
              </span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {entry.notes.map((note, index) => (
                <li key={index} className="flex gap-2 text-xs text-sc-muted">
                  <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-sc-faint" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Modal>
  );
}
