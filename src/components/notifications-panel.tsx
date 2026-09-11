"use client";

import { X } from "lucide-react";
import { useGalaxyStore } from "@/store/instances-store";
import { SEVERITY_META } from "@/lib/severity";
import { cn, formatRelativeTime } from "@/lib/utils";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const notifications = useGalaxyStore((state) => state.notifications);
  const clearNotifications = useGalaxyStore((state) => state.clearNotifications);
  const highlightInstance = useGalaxyStore((state) => state.highlightInstance);
  const toastSeconds = useGalaxyStore((state) => state.toastSeconds);
  const setToastSeconds = useGalaxyStore((state) => state.setToastSeconds);

  return (
    <aside
      aria-label="Notifications"
      aria-hidden={!open}
      className={cn(
        "fixed inset-y-0 right-0 z-40 flex w-80 max-w-[90vw] flex-col border-l border-sc-border",
        "bg-sc-surface shadow-2xl shadow-black/40 transition-transform duration-200 ease-out",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-sc-border-soft px-4 py-3">
        <h2 className="text-sm font-semibold text-sc-text">
          Notifications
          {notifications.length > 0 ? (
            <span className="ml-1.5 text-xs font-normal text-sc-faint">
              ({notifications.length})
            </span>
          ) : null}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearNotifications}
            disabled={notifications.length === 0}
            className="rounded-md px-2 py-1 text-[11px] font-medium text-sc-muted transition-colors hover:bg-sc-active hover:text-sc-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide notifications"
            title="Hide notifications"
            className="rounded-md p-1 text-sc-faint transition-colors hover:bg-sc-active hover:text-sc-text"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-sc-faint">
            No new critical or high cases yet.
          </p>
        ) : (
          <ul className="divide-y divide-sc-border-soft">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    highlightInstance(n.instanceId);
                    onClose();
                  }}
                  title={`Show ${n.instanceName}`}
                  className="block w-full px-4 py-3 text-left transition-colors hover:bg-sc-active"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: SEVERITY_META[n.severity].token }}
                    />
                    <p className="truncate text-xs font-medium text-sc-text">{n.instanceName}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-sc-muted">
                    {n.delta} new {SEVERITY_META[n.severity].label.toLowerCase()} case
                    {n.delta === 1 ? "" : "s"} · {n.total.toLocaleString()} total
                  </p>
                  <p className="mt-0.5 text-[10px] text-sc-faint">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-sc-border-soft px-4 py-3">
        <label className="flex items-center justify-between gap-2 text-[11px] text-sc-muted">
          <span>Auto-dismiss pop-ups after</span>
          <span className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={300}
              value={toastSeconds}
              onChange={(event) => setToastSeconds(Number(event.target.value))}
              className="w-14 rounded-md border border-sc-border bg-sc-bg px-2 py-1 text-right text-xs text-sc-text focus:border-sc-link focus:outline-none"
            />
            <span className="text-sc-faint">s</span>
          </span>
        </label>
      </footer>
    </aside>
  );
}
