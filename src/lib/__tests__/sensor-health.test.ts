import { overallSensorHealth, sensorCategories } from "@/lib/sensor-health";
import type { SensorStatus } from "@/lib/types";

const base: SensorStatus = {
  instanceId: "x",
  status: "ok",
  total: 26,
  byFeature: { wds: 21, ds: 2, modular: 3 },
  connection: { connected: 21, disconnected: 5, other: 0 },
  upgrade: { need: 26, ok: 0 },
  noOutput: 0,
  fetchedAt: "2026-09-04T00:00:00.000Z",
};

describe("sensorCategories", () => {
  it("flags disconnected sensors as trouble", () => {
    const connection = sensorCategories(base).find((c) => c.key === "connection")!;
    expect(connection.health).toBe("trouble");
    expect(connection.headline).toBe("5 down");
  });

  it("marks all-connected as healthy", () => {
    const healthy = { ...base, connection: { connected: 26, disconnected: 0, other: 0 } };
    const connection = sensorCategories(healthy).find((c) => c.key === "connection")!;
    expect(connection.health).toBe("healthy");
    expect(connection.headline).toBe("26 up");
  });

  it("flags sensors needing upgrade as trouble", () => {
    const upgrade = sensorCategories(base).find((c) => c.key === "upgrade")!;
    expect(upgrade.health).toBe("trouble");
    expect(upgrade.headline).toBe("26 need upgrade");
  });

  it("treats feature as an informational breakdown", () => {
    const feature = sensorCategories(base).find((c) => c.key === "feature")!;
    expect(feature.health).toBe("unknown");
    expect(feature.breakdown.map((b) => b.label)).toEqual(["WDS", "Modular", "DS"]);
  });
});

describe("overallSensorHealth", () => {
  it("is trouble when anything is wrong", () => {
    expect(overallSensorHealth(base)).toBe("trouble");
  });

  it("is healthy when all connected and up to date", () => {
    const good = {
      ...base,
      connection: { connected: 26, disconnected: 0, other: 0 },
      upgrade: { need: 0, ok: 26 },
    };
    expect(overallSensorHealth(good)).toBe("healthy");
  });

  it("is unknown on error or when there are no sensors", () => {
    expect(overallSensorHealth({ ...base, status: "error" })).toBe("unknown");
    expect(overallSensorHealth({ ...base, total: 0 })).toBe("unknown");
  });
});
