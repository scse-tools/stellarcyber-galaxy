"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GalaxyHeader } from "@/components/galaxy-header";
import { InstanceTile } from "@/components/instance-tile";
import { InstanceFormModal } from "@/components/instance-form-modal";
import { GlobalSettingsModal } from "@/components/global-settings-modal";
import { Button } from "@/components/ui/button";
import { useGalaxyStore } from "@/store/instances-store";
import { EMPTY_COUNTS, SEVERITIES, type InstanceSummary, type SeverityCounts } from "@/lib/types";
import type { SessionUser } from "@/lib/auth/types";

const POLL_INTERVAL_MS = 60_000;

export function GalaxyGrid({ user }: { user: SessionUser }) {
  const { instances, stats, sensors, connectors, refreshing, loading, error, range } =
    useGalaxyStore();
  const loadInstances = useGalaxyStore((state) => state.loadInstances);
  const refreshStats = useGalaxyStore((state) => state.refreshStats);
  const removeInstance = useGalaxyStore((state) => state.removeInstance);
  const setRange = useGalaxyStore((state) => state.setRange);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InstanceSummary | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isAdmin = user.role === "admin";

  useEffect(() => {
    void loadInstances().then(() => refreshStats());
  }, [loadInstances, refreshStats]);

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
        onRefresh={() => void refreshStats()}
        onAdd={openAdd}
        onOpenSettings={() => setSettingsOpen(true)}
        user={user}
      />

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
        <div className="grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-5">
          {instances.map((instance) => (
            <InstanceTile
              key={instance.id}
              instance={instance}
              stats={stats[instance.id]}
              sensors={sensors[instance.id]}
              connectors={connectors[instance.id]}
              refreshing={refreshing[instance.id]}
              onOpenSettings={isAdmin ? openConfigure : undefined}
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
