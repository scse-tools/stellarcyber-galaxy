"use client";

import { create } from "zustand";
import type { InstanceStats, InstanceSummary, SensorStatus } from "@/lib/types";
import type { InstanceInput, InstanceUpdate } from "@/lib/schemas";
import { DEFAULT_SELECTION, resolveTimeRange, type TimeRangeSelection } from "@/lib/time-range";

const RANGE_STORAGE_KEY = "galaxy.timeRange";

/** The picked window survives a reload; a corrupt or absent value falls back to 24h. */
function storedRange(): TimeRangeSelection {
  if (typeof window === "undefined") return DEFAULT_SELECTION;
  try {
    const raw = window.localStorage.getItem(RANGE_STORAGE_KEY);
    if (!raw) return DEFAULT_SELECTION;
    const parsed = JSON.parse(raw) as TimeRangeSelection;
    return parsed && typeof parsed.preset === "string" ? parsed : DEFAULT_SELECTION;
  } catch {
    return DEFAULT_SELECTION;
  }
}

function persistRange(range: TimeRangeSelection): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RANGE_STORAGE_KEY, JSON.stringify(range));
  } catch {
    /* private browsing - the picker still works for this session */
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const issues = (payload as { issues?: Record<string, string[]> }).issues;
    const detail = issues ? Object.values(issues).flat().join(" ") : "";
    throw new Error([(payload as { error?: string }).error, detail].filter(Boolean).join(" "));
  }
  return payload as T;
}

interface GalaxyState {
  instances: InstanceSummary[];
  stats: Record<string, InstanceStats>;
  sensors: Record<string, SensorStatus>;
  refreshing: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  range: TimeRangeSelection;
  setRange: (range: TimeRangeSelection) => Promise<void>;
  loadInstances: () => Promise<void>;
  refreshStats: (id?: string) => Promise<void>;
  saveInstance: (input: InstanceInput | InstanceUpdate, id?: string) => Promise<void>;
  removeInstance: (id: string) => Promise<void>;
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  instances: [],
  stats: {},
  sensors: {},
  refreshing: {},
  loading: true,
  error: null,
  range: storedRange(),

  async setRange(range) {
    persistRange(range);
    set({ range });
    // Every tile's numbers depend on the window, so re-poll them all.
    await get().refreshStats();
  },

  async loadInstances() {
    try {
      const { instances } = await request<{ instances: InstanceSummary[] }>("/api/instances");
      set({ instances, loading: false, error: null });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "Load failed." });
    }
  },

  async refreshStats(id) {
    const targets = id ? [id] : get().instances.map((instance) => instance.id);
    if (targets.length === 0) return;
    set((state) => ({
      refreshing: { ...state.refreshing, ...Object.fromEntries(targets.map((t) => [t, true])) },
    }));
    await Promise.all(
      targets.map(async (target) => {
        try {
          const { from, to } = resolveTimeRange(get().range);
          const [{ stats }, sensorResult] = await Promise.all([
            request<{ stats: InstanceStats }>(
              `/api/instances/${target}/stats?from=${from}&to=${to}`,
            ),
            request<{ sensors: SensorStatus }>(`/api/instances/${target}/sensors`).catch(
              () => null,
            ),
          ]);
          set((state) => ({
            stats: { ...state.stats, [target]: stats },
            sensors: sensorResult
              ? { ...state.sensors, [target]: sensorResult.sensors }
              : state.sensors,
          }));
        } catch (error) {
          set((state) => ({
            stats: {
              ...state.stats,
              [target]: {
                instanceId: target,
                status: "error",
                counts: { critical: 0, high: 0, medium: 0, low: 0 },
                total: 0,
                toolUsed: null,
                latencyMs: 0,
                fetchedAt: new Date().toISOString(),
                error: error instanceof Error ? error.message : "Request failed.",
              },
            },
          }));
        } finally {
          set((state) => ({ refreshing: { ...state.refreshing, [target]: false } }));
        }
      }),
    );
  },

  async saveInstance(input, id) {
    if (id) {
      await request(`/api/instances/${id}`, { method: "PATCH", body: JSON.stringify(input) });
    } else {
      await request("/api/instances", { method: "POST", body: JSON.stringify(input) });
    }
    await get().loadInstances();
    await get().refreshStats(id);
  },

  async removeInstance(id) {
    await request(`/api/instances/${id}`, { method: "DELETE" });
    set((state) => {
      const stats = { ...state.stats };
      const sensors = { ...state.sensors };
      delete stats[id];
      delete sensors[id];
      return { instances: state.instances.filter((i) => i.id !== id), stats, sensors };
    });
  },
}));
