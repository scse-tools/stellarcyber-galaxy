"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useGalaxyStore } from "@/store/instances-store";
import { SEVERITY_META } from "@/lib/severity";
import { cn } from "@/lib/utils";

const TOAST_DURATION_MS = 3000;

/** Pop-up alerts for new critical/high cases. Each toast auto-dismisses after 3s; the full
 * history stays in the notifications panel regardless. */
export function ToastStack() {
  const notifications = useGalaxyStore((state) => state.notifications);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    const fresh = notifications.filter((n) => !seenIds.current.has(n.id));
    if (fresh.length === 0) return;
    for (const n of fresh) seenIds.current.add(n.id);
    setVisibleIds((ids) => [...ids, ...fresh.map((n) => n.id)]);
    const timers = fresh.map((n) =>
      setTimeout(() => {
        setVisibleIds((ids) => ids.filter((id) => id !== n.id));
      }, TOAST_DURATION_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [notifications]);

  const visible = notifications.filter((n) => visibleIds.includes(n.id));
  if (visible.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {visible.map((n) => (
        <div
          key={n.id}
          className={cn(
            "toast-rise pointer-events-auto flex items-start gap-2 rounded-lg border p-3 shadow-xl shadow-black/30 backdrop-blur",
            "border-sc-border bg-sc-surface/95",
          )}
        >
          <AlertTriangle
            aria-hidden
            size={16}
            className="mt-0.5 shrink-0"
            style={{ color: SEVERITY_META[n.severity].token }}
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-sc-text">{n.instanceName}</p>
            <p className="mt-0.5 text-[11px] text-sc-muted">
              {n.delta} new {SEVERITY_META[n.severity].label.toLowerCase()} case
              {n.delta === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
