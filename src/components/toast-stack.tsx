"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useGalaxyStore } from "@/store/instances-store";
import { SEVERITY_META } from "@/lib/severity";
import { cn } from "@/lib/utils";

/**
 * Pop-up alerts for new critical/high cases. Each toast auto-dismisses after the configured
 * number of seconds (default 15), can be dismissed manually, and highlights the originating
 * tile when clicked. The full history stays in the notifications panel regardless.
 */
export function ToastStack() {
  const notifications = useGalaxyStore((state) => state.notifications);
  const toastSeconds = useGalaxyStore((state) => state.toastSeconds);
  const highlightInstance = useGalaxyStore((state) => state.highlightInstance);

  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const seenIds = useRef(new Set<string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = (id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setVisibleIds((ids) => ids.filter((entry) => entry !== id));
  };

  // Show each new notification once, and schedule its own auto-dismiss timer.
  useEffect(() => {
    const fresh = notifications.filter((n) => !seenIds.current.has(n.id));
    if (fresh.length === 0) return;
    for (const n of fresh) {
      seenIds.current.add(n.id);
      timers.current.set(
        n.id,
        setTimeout(() => dismiss(n.id), Math.max(1, toastSeconds) * 1000),
      );
    }
    setVisibleIds((ids) => [...fresh.map((n) => n.id).reverse(), ...ids]);
    // Timers are keyed and cleared on dismiss/unmount — never on every notifications change,
    // which is what previously left toasts stuck on screen.
  }, [notifications, toastSeconds]);

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach(clearTimeout);
  }, []);

  const visible = visibleIds
    .map((id) => notifications.find((n) => n.id === id))
    .filter((n): n is (typeof notifications)[number] => Boolean(n));
  if (visible.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {visible.map((n) => (
        <div
          key={n.id}
          className="toast-rise pointer-events-auto flex items-start gap-2 rounded-lg border border-sc-border bg-sc-surface/95 p-3 shadow-xl shadow-black/30 backdrop-blur"
        >
          <button
            type="button"
            onClick={() => {
              highlightInstance(n.instanceId);
              dismiss(n.id);
            }}
            title={`Show ${n.instanceName}`}
            className="flex min-w-0 flex-1 items-start gap-2 text-left"
          >
            <AlertTriangle
              aria-hidden
              size={16}
              className="mt-0.5 shrink-0"
              style={{ color: SEVERITY_META[n.severity].token }}
            />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-sc-text">
                {n.instanceName}
              </span>
              <span className="mt-0.5 block text-[11px] text-sc-muted">
                {n.delta} new {SEVERITY_META[n.severity].label.toLowerCase()} case
                {n.delta === 1 ? "" : "s"}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => dismiss(n.id)}
            aria-label="Dismiss"
            className={cn(
              "-mr-1 -mt-1 shrink-0 rounded-md p-1 text-sc-faint transition-colors",
              "hover:bg-sc-active hover:text-sc-text",
            )}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
