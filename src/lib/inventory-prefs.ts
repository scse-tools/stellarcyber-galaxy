import type { InventoryTab } from "@/components/inventory-toolbar";

/** Per-tab overrides of column visibility (col → shown); absence means the DEFAULT_VISIBLE choice. */
export type ColumnVisibility = Record<string, boolean>;

const KEY = (tab: InventoryTab) => `galaxy.inventory.columns.${tab}`;

/** Loads the saved show/hide overrides for a tab, or {} when none/unavailable. */
export function loadColumnVisibility(tab: InventoryTab): ColumnVisibility {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY(tab));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as ColumnVisibility;
  } catch {
    // ignore malformed / unavailable storage
  }
  return {};
}

/** Persists the show/hide overrides for a tab so column choices survive across sessions. */
export function saveColumnVisibility(tab: InventoryTab, visibility: ColumnVisibility): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(tab), JSON.stringify(visibility));
  } catch {
    // ignore quota / unavailable storage
  }
}
