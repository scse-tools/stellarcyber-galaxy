"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GalaxyHeader } from "@/components/galaxy-header";
import { InstanceTile } from "@/components/instance-tile";
import { InstanceFormModal } from "@/components/instance-form-modal";
import { GlobalSettingsModal } from "@/components/global-settings-modal";
import { NotificationsPanel } from "@/components/notifications-panel";
import { ToastStack } from "@/components/toast-stack";
import { Button } from "@/components/ui/button";
import { useGalaxyStore } from "@/store/instances-store";
import {
  EMPTY_COUNTS,
  SEVERITIES,
  type HealthTotals,
  type InstanceStats,
  type InstanceSummary,
  type SeverityCounts,
} from "@/lib/types";
import type { SessionUser } from "@/lib/auth/types";

const POLL_INTERVAL_MS = 60_000;

export function GalaxyGrid({ user }: { user: SessionUser }) {
  const {
    instances,
    stats,
    sensors,
    connectors,
    refreshing,
    loading,
    error,
    range,
    tenants,
    selectedTenant,
    notifications,
    viewMode,
  } = useGalaxyStore();
  const loadInstances = useGalaxyStore((state) => state.loadInstances);
  const refreshStats = useGalaxyStore((state) => state.refreshStats);
  const fetchTenants = useGalaxyStore((state) => state.fetchTenants);
  const setSelectedTenant = useGalaxyStore((state) => state.setSelectedTenant);
  const removeInstance = useGalaxyStore((state) => state.removeInstance);
  const cloneInstance = useGalaxyStore((state) => state.cloneInstance);
  const highlightedInstanceId = useGalaxyStore((state) => state.highlightedInstanceId);
  const setRange = useGalaxyStore((state) => state.setRange);
  const setViewMode = useGalaxyStore((state) => state.setViewMode);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InstanceSummary | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const isAdmin = user.role === "admin";

  useEffect(() => {
    // Initialization: load instances, then in parallel pull each tile's stats and its tenant list.
    void loadInstances().then(() => {
      void refreshStats();
      void fetchTenants();
    });
  }, [loadInstances, refreshStats, fetchTenants]);

  useEffect(() => {
    const timer = setInterval(() => void refreshStats(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refreshStats]);

  const totals = useMemo<SeverityCounts>(() => {
    const sum = { ...EMPTY_COUNTS };
    for (const stat of Object.values(stats)) {
      if (stat.status !== "ok") continue;
      for (const severity of SEVERITIES) sum[severity] += stat.counts[severity];
    }
    return sum;
  }, [stats]);

  const healthTotals = useMemo<HealthTotals>(() => {
    const acc: HealthTotals = {
      sensorsTotal: 0,
      sensorsDisconnected: 0,
      connectorsActive: 0,
      connectorsIssues: 0,
    };
    for (const sensor of Object.values(sensors)) {
      if (sensor.status !== "ok") continue;
      acc.sensorsTotal += sensor.total;
      acc.sensorsDisconnected += sensor.connection.disconnected + sensor.connection.other;
    }
    for (const connector of Object.values(connectors)) {
      if (connector.status !== "ok") continue;
      acc.connectorsActive += connector.active;
      acc.connectorsIssues += connector.issues;
    }
    return acc;
  }, [sensors, connectors]);

  // Tiles flow left-to-right, top-to-bottom, ranked by Critical, then High, then total open cases.
  const sortedInstances = useMemo(() => {
    if (viewMode === "health") {
      // Most trouble first: unreachable health counts high so it surfaces for attention.
      const trouble = (id: string) => {
        const s = sensors[id];
        const c = connectors[id];
        let score = 0;
        score += !s || s.status !== "ok" ? 1000 : s.connection.disconnected + s.connection.other;
        score += !c || c.status !== "ok" ? 1000 : c.issues;
        return score;
      };
      return [...instances].sort((a, b) => trouble(b.id) - trouble(a.id));
    }
    const rank = (s?: InstanceStats) =>
      s && s.status === "ok"
        ? { c: s.counts.critical, h: s.counts.high, t: s.total }
        : { c: -1, h: -1, t: -1 };
    return [...instances].sort((a, b) => {
      const ra = rank(stats[a.id]);
      const rb = rank(stats[b.id]);
      return rb.c - ra.c || rb.h - ra.h || rb.t - ra.t;
    });
  }, [instances, stats, sensors, connectors, viewMode]);

  const onlineCount = Object.values(stats).filter((stat) => stat.status === "ok").length;
  const anyRefreshing = Object.values(refreshing).some(Boolean);

  const openAdd = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openConfigure = useCallback((instance: InstanceSummary) => {
    setEditing(instance);
    setFormOpen(true);
  }, []);

  const handleDuplicate = useCallback(
    async (instance: InstanceSummary) => {
      // Clone server-side, then reopen the config on the copy to edit its name/tenant.
      const clone = await cloneInstance(instance.id);
      setEditing(clone);
    },
    [cloneInstance],
  );

  const handleDelete = useCallback(
    async (instance: InstanceSummary) => {
      if (!window.confirm(`Remove ${instance.name} from the galaxy?`)) return;
      await removeInstance(instance.id);
      setFormOpen(false);
      setEditing(null);
    },
    [removeInstance],
  );

  return (
    <>
      <GalaxyHeader
        totals={totals}
        instanceCount={instances.length}
        onlineCount={onlineCount}
        refreshing={anyRefreshing}
        range={range}
        onRangeChange={(next) => void setRange(next)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        healthTotals={healthTotals}
        onRefresh={() => void refreshStats()}
        onAdd={openAdd}
        onOpenSettings={() => setSettingsOpen(true)}
        user={user}
        notificationCount={notifications.length}
        notificationsOpen={notificationsOpen}
        onToggleNotifications={() => setNotificationsOpen((open) => !open)}
      />

      <ToastStack />
      <NotificationsPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />

      {error ? (
        <p className="mb-6 rounded-md border border-critical/40 bg-critical/10 px-4 py-3 text-sm text-critical">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-sc-faint">Loading constellation…</p>
      ) : instances.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] items-start gap-3">
          {sortedInstances.map((instance) => (
            <InstanceTile
              key={instance.id}
              instance={instance}
              stats={stats[instance.id]}
              sensors={sensors[instance.id]}
              connectors={connectors[instance.id]}
              refreshing={refreshing[instance.id]}
              highlighted={highlightedInstanceId === instance.id}
              mode={viewMode}
              onOpenSettings={isAdmin ? openConfigure : undefined}
              tenants={tenants[instance.id]}
              selectedTenant={selectedTenant[instance.id] ?? null}
              onSelectTenant={(tenantId) => setSelectedTenant(instance.id, tenantId)}
            />
          ))}
        </div>
      )}

      <InstanceFormModal
        open={formOpen}
        instance={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onDelete={(instance) => void handleDelete(instance)}
        onDuplicate={(instance) => void handleDuplicate(instance)}
      />

      {isAdmin ? (
        <GlobalSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          currentUserId={user.id}
        />
      ) : null}
    </>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-sc-border bg-sc-surface/60 px-6 py-16 text-center">
      <h2 className="text-sm font-semibold text-sc-text">No instances yet</h2>
      <p className="mx-auto mt-2 max-w-md text-xs text-sc-faint">
        Add a Stellar Cyber instance with its MCP endpoint and credentials. Each one becomes a tile
        showing open cases by severity.
      </p>
      <Button variant="primary" className="mt-5" onClick={onAdd}>
        Add your first instance
      </Button>
    </div>
  );
}
