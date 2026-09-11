"use client";

import { create } from "zustand";
import type {
  AlertNotification,
  ConnectorStatus,
  InstanceStats,
  InstanceSummary,
  SensorStatus,
  Tenant,
} from "@/lib/types";
import type { InstanceInput, InstanceUpdate } from "@/lib/schemas";
import { DEFAULT_SELECTION, resolveTimeRange, type TimeRangeSelection } from "@/lib/time-range";

const RANGE_STORAGE_KEY = "galaxy.timeRange";
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
  setRange: (range: TimeRangeSelection) => Promise<void>;
  loadInstances: () => Promise<void>;
  refreshStats: (id?: string) => Promise<void>;
  fetchTenants: (id?: string) => Promise<void>;
  setSelectedTenant: (instanceId: string, tenantId: string | null) => void;
  clearNotifications: () => void;
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
