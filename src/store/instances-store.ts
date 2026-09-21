"use client";

import { create } from "zustand";
import type {
  AlertNotification,
  ConnectorStatus,
  InstanceStats,
  InstanceSummary,
  SensorStatus,
  Tenant,
  ViewMode,
  LayoutMode,
} from "@/lib/types";
import type { InstanceInput, InstanceUpdate } from "@/lib/schemas";
import { DEFAULT_SELECTION, resolveTimeRange, type TimeRangeSelection } from "@/lib/time-range";

const RANGE_STORAGE_KEY = "galaxy.timeRange";
const TOAST_SECONDS_KEY = "galaxy.toastSeconds";
const VIEW_MODE_KEY = "galaxy.viewMode";
const LAYOUT_KEY = "galaxy.layout";
const PINNED_KEY = "galaxy.pinnedIds";
const DEFAULT_TOAST_SECONDS = 5;
const HIGHLIGHT_MS = 2600;
/** Notifications are session-only; cap the backlog so a long-running tab doesn't grow it forever. */
const MAX_NOTIFICATIONS = 200;
const ALERTED_SEVERITIES = ["critical", "high"] as const;

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

/** Toast auto-dismiss seconds survive a reload; clamp to a sane range. */
function storedToastSeconds(): number {
  if (typeof window === "undefined") return DEFAULT_TOAST_SECONDS;
  try {
    const raw = Number(window.localStorage.getItem(TOAST_SECONDS_KEY));
    return Number.isFinite(raw) && raw >= 1 && raw <= 300 ? raw : DEFAULT_TOAST_SECONDS;
  } catch {
    return DEFAULT_TOAST_SECONDS;
  }
}

function storedViewMode(): ViewMode {
  if (typeof window === "undefined") return "cases";
  try {
    return window.localStorage.getItem(VIEW_MODE_KEY) === "health" ? "health" : "cases";
  } catch {
    return "cases";
  }
}

function storedLayout(): LayoutMode {
  if (typeof window === "undefined") return "grid";
  try {
    return window.localStorage.getItem(LAYOUT_KEY) === "table" ? "table" : "grid";
  } catch {
    return "grid";
  }
}

/** Pinned instance ids survive a reload; a corrupt value falls back to none pinned. */
function storedPinned(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PINNED_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function persistPinned(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
  } catch {
    /* private browsing - pins still apply for this session */
  }
}

// A single timer clears the tile highlight; module-scoped so a new highlight resets it.
let highlightTimer: ReturnType<typeof setTimeout> | undefined;

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
  connectors: Record<string, ConnectorStatus>;
  refreshing: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  range: TimeRangeSelection;
  /** Tenants available to each instance's API key, populated during initialization. */
  tenants: Record<string, Tenant[]>;
  /**
   * Session-only view override, keyed by instance id: a tenant id scopes that tile's queries to
   * it; `null` means "use the instance's configured default"; an absent key behaves the same as
   * `null`. Never persisted to the instance's saved settings.
   */
  selectedTenant: Record<string, string | null>;
  /** New critical/high cases found since the previous poll, newest first. Session-only. */
  notifications: AlertNotification[];
  /** Seconds a toast stays on screen before auto-dismissing (configurable, default 15). */
  toastSeconds: number;
  /** Which lens the tiles present: "cases" (default) or "health" (sensors + connectors only). */
  viewMode: ViewMode;
  /** Grid of tiles (default) or a full table of rows. */
  layout: LayoutMode;
  /** The instance whose tile is momentarily highlighted after a toast/notification click. */
  highlightedInstanceId: string | null;
  /** Instance ids pinned to the top of the tile/table order; persisted across sessions. */
  pinnedIds: string[];
  setRange: (range: TimeRangeSelection) => Promise<void>;
  loadInstances: () => Promise<void>;
  refreshStats: (id?: string) => Promise<void>;
  fetchTenants: (id?: string) => Promise<void>;
  setSelectedTenant: (instanceId: string, tenantId: string | null) => void;
  clearNotifications: () => void;
  setToastSeconds: (seconds: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setLayout: (layout: LayoutMode) => void;
  togglePin: (instanceId: string) => void;
  highlightInstance: (instanceId: string) => void;
  saveInstance: (input: InstanceInput | InstanceUpdate, id?: string) => Promise<void>;
  cloneInstance: (id: string) => Promise<InstanceSummary>;
  removeInstance: (id: string) => Promise<void>;
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  instances: [],
  stats: {},
  sensors: {},
  connectors: {},
  refreshing: {},
  loading: true,
  error: null,
  range: storedRange(),
  tenants: {},
  selectedTenant: {},
  notifications: [],
  toastSeconds: storedToastSeconds(),
  viewMode: storedViewMode(),
  layout: storedLayout(),
  highlightedInstanceId: null,
  pinnedIds: storedPinned(),

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
          // `null`/absent means "use the instance's configured tenant" — no query param sent.
          const tenant = get().selectedTenant[target];
          const tenantParams = new URLSearchParams();
          if (tenant) tenantParams.set("tenantId", tenant);
          const withTenant = (params: URLSearchParams) => {
            for (const [key, value] of tenantParams) params.set(key, value);
            return params.toString();
          };
          const statsParams = new URLSearchParams({ from: String(from), to: String(to) });
          const [{ stats }, sensorResult, connectorResult] = await Promise.all([
            request<{ stats: InstanceStats }>(
              `/api/instances/${target}/stats?${withTenant(statsParams)}`,
            ),
            request<{ sensors: SensorStatus }>(
              `/api/instances/${target}/sensors?${withTenant(new URLSearchParams())}`,
            ).catch(() => null),
            request<{ connectors: ConnectorStatus }>(
              `/api/instances/${target}/connectors?${withTenant(new URLSearchParams())}`,
            ).catch(() => null),
          ]);

          // A new critical/high alert fires only once a baseline poll exists for this instance,
          // so a freshly loaded or freshly reachable tile doesn't dump its whole backlog at once.
          const previous = get().stats[target];
          const alerts: AlertNotification[] = [];
          if (previous?.status === "ok" && stats.status === "ok") {
            const instanceName = get().instances.find((i) => i.id === target)?.name ?? target;
            for (const severity of ALERTED_SEVERITIES) {
              const delta = stats.counts[severity] - previous.counts[severity];
              if (delta > 0) {
                alerts.push({
                  id: `${target}-${severity}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  instanceId: target,
                  instanceName,
                  severity,
                  delta,
                  total: stats.counts[severity],
                  createdAt: new Date().toISOString(),
                });
              }
            }
          }

          set((state) => ({
            stats: { ...state.stats, [target]: stats },
            sensors: sensorResult
              ? { ...state.sensors, [target]: sensorResult.sensors }
              : state.sensors,
            connectors: connectorResult
              ? { ...state.connectors, [target]: connectorResult.connectors }
              : state.connectors,
            notifications:
              alerts.length > 0
                ? [...alerts, ...state.notifications].slice(0, MAX_NOTIFICATIONS)
                : state.notifications,
          }));
        } catch (error) {
          set((state) => ({
            stats: {
              ...state.stats,
              [target]: {
                instanceId: target,
                status: "error",
                counts: { critical: 0, high: 0, medium: 0, low: 0 },
                statuses: [],
                statusCounts: { critical: {}, high: {}, medium: {}, low: {} },
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

  async fetchTenants(id) {
    const targets = id ? [id] : get().instances.map((instance) => instance.id);
    if (targets.length === 0) return;
    await Promise.all(
      targets.map(async (target) => {
        const result = await request<{ tenants: Tenant[] }>(
          `/api/instances/${target}/tenants`,
        ).catch(() => null);
        if (!result) return;
        set((state) => ({ tenants: { ...state.tenants, [target]: result.tenants } }));
      }),
    );
  },

  setSelectedTenant(instanceId, tenantId) {
    set((state) => ({
      selectedTenant: { ...state.selectedTenant, [instanceId]: tenantId },
    }));
    void get().refreshStats(instanceId);
  },

  clearNotifications() {
    set({ notifications: [] });
  },

  setToastSeconds(seconds) {
    const clamped = Math.min(300, Math.max(1, Math.round(seconds)));
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(TOAST_SECONDS_KEY, String(clamped));
      } catch {
        /* private browsing - still applies for this session */
      }
    }
    set({ toastSeconds: clamped });
  },

  setViewMode(mode) {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(VIEW_MODE_KEY, mode);
      } catch {
        /* private browsing - still applies for this session */
      }
    }
    set({ viewMode: mode });
  },

  setLayout(layout) {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LAYOUT_KEY, layout);
      } catch {
        /* private browsing - still applies for this session */
      }
    }
    set({ layout });
  },

  togglePin(instanceId) {
    const pinnedIds = get().pinnedIds.includes(instanceId)
      ? get().pinnedIds.filter((id) => id !== instanceId)
      : [...get().pinnedIds, instanceId];
    persistPinned(pinnedIds);
    set({ pinnedIds });
  },

  highlightInstance(instanceId) {
    if (highlightTimer) clearTimeout(highlightTimer);
    set({ highlightedInstanceId: instanceId });
    highlightTimer = setTimeout(() => set({ highlightedInstanceId: null }), HIGHLIGHT_MS);
  },

  async saveInstance(input, id) {
    if (id) {
      await request(`/api/instances/${id}`, { method: "PATCH", body: JSON.stringify(input) });
    } else {
      await request("/api/instances", { method: "POST", body: JSON.stringify(input) });
    }
    await get().loadInstances();
    await Promise.all([get().refreshStats(id), get().fetchTenants(id)]);
  },

  async cloneInstance(id) {
    const { instance } = await request<{ instance: InstanceSummary }>(
      `/api/instances/${id}/clone`,
      { method: "POST", body: "{}" },
    );
    await get().loadInstances();
    await Promise.all([get().refreshStats(instance.id), get().fetchTenants(instance.id)]);
    return instance;
  },

  async removeInstance(id) {
    await request(`/api/instances/${id}`, { method: "DELETE" });
    set((state) => {
      const stats = { ...state.stats };
      const sensors = { ...state.sensors };
      const connectors = { ...state.connectors };
      const tenants = { ...state.tenants };
      const selectedTenant = { ...state.selectedTenant };
      delete stats[id];
      delete sensors[id];
      delete connectors[id];
      delete tenants[id];
      delete selectedTenant[id];
      return {
        instances: state.instances.filter((i) => i.id !== id),
        stats,
        sensors,
        connectors,
        tenants,
        selectedTenant,
        notifications: state.notifications.filter((n) => n.instanceId !== id),
      };
    });
  },
}));
