import type { SensorHealth, SensorStatus } from "@/lib/types";

export interface SensorCategory {
  key: "connection" | "upgrade" | "feature";
  label: string;
  health: SensorHealth;
  /** Short headline, e.g. "21/26 up" or "5 down". */
  headline: string;
  /** Per-bucket breakdown chips. */
  breakdown: Array<{ label: string; count: number; trouble?: boolean }>;
}

const featureLabel = (feature: string): string => {
  const known: Record<string, string> = {
    wds: "WDS",
    ds: "DS",
    modular: "Modular",
    unknown: "Unknown",
  };
  return known[feature] ?? feature.toUpperCase();
};

/**
 * Turns a sensor summary into three display categories. Connection and upgrade carry a green/red
 * health signal; feature is an informational breakdown of sensor types.
 */
export function sensorCategories(sensors: SensorStatus): SensorCategory[] {
  const { connection, upgrade, byFeature } = sensors;
  const down = connection.disconnected + connection.other;

  return [
    {
      key: "connection",
      label: "Connection",
      health: down === 0 ? "healthy" : "trouble",
      headline: down === 0 ? `${connection.connected} up` : `${down} down`,
      breakdown: [
        { label: "Connected", count: connection.connected },
        { label: "Disconnected", count: connection.disconnected, trouble: connection.disconnected > 0 },
        ...(connection.other > 0 ? [{ label: "Other", count: connection.other, trouble: true }] : []),
      ],
    },
    {
      key: "upgrade",
      label: "Upgrade",
      health: upgrade.need === 0 ? "healthy" : "trouble",
      headline: upgrade.need === 0 ? "up to date" : `${upgrade.need} need upgrade`,
      breakdown: [
        { label: "Up to date", count: upgrade.ok },
        { label: "Need upgrade", count: upgrade.need, trouble: upgrade.need > 0 },
      ],
    },
    {
      key: "feature",
      label: "Feature",
      health: "unknown",
      headline: `${Object.keys(byFeature).length} type${Object.keys(byFeature).length === 1 ? "" : "s"}`,
      breakdown: Object.entries(byFeature)
        .sort((a, b) => b[1] - a[1])
        .map(([feature, count]) => ({ label: featureLabel(feature), count })),
    },
  ];
}

/** Overall sensor health: trouble if any health-bearing category is in trouble. */
export function overallSensorHealth(sensors: SensorStatus): SensorHealth {
  if (sensors.status !== "ok") return "unknown";
  if (sensors.total === 0) return "unknown";
  const down = sensors.connection.disconnected + sensors.connection.other;
  return down > 0 || sensors.upgrade.need > 0 ? "trouble" : "healthy";
}
