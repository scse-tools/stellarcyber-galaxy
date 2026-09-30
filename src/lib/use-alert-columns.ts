"use client";

import { useCallback, useEffect, useState } from "react";
import { defaultVisibleColumns } from "@/lib/investigation-columns";

const STORAGE_KEY = "galaxy.investigation.alertColumns";

interface Prefs {
  /** Column order, including hidden ones. */
  order: string[];
  /** Columns the user has hidden. */
  hidden: string[];
}

function readPrefs(): Prefs | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    if (!Array.isArray(parsed.order) || !Array.isArray(parsed.hidden)) return null;
    return { order: parsed.order, hidden: parsed.hidden };
  } catch {
    return null;
  }
}

function writePrefs(prefs: Prefs): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* private browsing - preferences simply won't persist */
  }
}

/** Reconciles saved order/visibility with the columns actually present in the current alert set. */
function reconcile(all: string[], saved: Prefs | null): Prefs {
  if (!saved) {
    const visible = new Set(defaultVisibleColumns(all));
    return { order: all, hidden: all.filter((c) => !visible.has(c)) };
  }
  const known = new Set(all);
  const order = saved.order.filter((c) => known.has(c));
  for (const column of all) if (!order.includes(column)) order.push(column);
  return { order, hidden: saved.hidden.filter((c) => known.has(c)) };
}

/**
 * Column order + visibility for the alerts table, persisted to localStorage so the user's
 * layout choices survive reloads and case switches.
 */
export function useAlertColumns(all: string[]) {
  const [prefs, setPrefs] = useState<Prefs>({ order: all, hidden: [] });

  // Reconcile whenever the available columns change (new case selected, etc.).
  useEffect(() => {
    if (!all.length) return;
    setPrefs((current) => {
      const saved = current.order.length ? current : readPrefs();
      return reconcile(all, saved);
    });
  }, [all]);

  const update = useCallback((next: Prefs) => {
    setPrefs(next);
    writePrefs(next);
  }, []);

  const hidden = new Set(prefs.hidden);
  const isVisible = useCallback((column: string) => !hidden.has(column), [prefs.hidden]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(
    (column: string) => {
      const set = new Set(prefs.hidden);
      if (set.has(column)) set.delete(column);
      else set.add(column);
      update({ order: prefs.order, hidden: [...set] });
    },
    [prefs, update],
  );

  const move = useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0 || from >= prefs.order.length || to >= prefs.order.length) return;
      const order = [...prefs.order];
      const [moved] = order.splice(from, 1);
      order.splice(to, 0, moved);
      update({ order, hidden: prefs.hidden });
    },
    [prefs, update],
  );

  const reset = useCallback(() => {
    const visible = new Set(defaultVisibleColumns(all));
    update({ order: all, hidden: all.filter((c) => !visible.has(c)) });
  }, [all, update]);

  const visibleColumns = prefs.order.filter((c) => !hidden.has(c));

  return { order: prefs.order, visibleColumns, isVisible, toggle, move, reset };
}
