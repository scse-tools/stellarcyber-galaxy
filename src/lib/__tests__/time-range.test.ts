import {
  describeRange,
  isCustomRangeValid,
  isSinceValid,
  resolveTimeRange,
  toLocalDateTimeValue,
} from "@/lib/time-range";

// 2026-09-04T15:30 local time.
const NOW = new Date(2026, 8, 4, 15, 30, 0, 0).getTime();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe("resolveTimeRange", () => {
  it("ends every relative window at now", () => {
    for (const preset of ["today", "1h", "12h", "24h", "7d", "14d", "1m"] as const) {
      expect(resolveTimeRange({ preset }, NOW).to).toBe(NOW);
    }
  });

  it("measures the hour and day presets exactly", () => {
    expect(NOW - resolveTimeRange({ preset: "1h" }, NOW).from).toBe(HOUR);
    expect(NOW - resolveTimeRange({ preset: "12h" }, NOW).from).toBe(12 * HOUR);
    expect(NOW - resolveTimeRange({ preset: "24h" }, NOW).from).toBe(DAY);
    expect(NOW - resolveTimeRange({ preset: "7d" }, NOW).from).toBe(7 * DAY);
    expect(NOW - resolveTimeRange({ preset: "14d" }, NOW).from).toBe(14 * DAY);
  });

  it("starts Today at local midnight, not 24 hours ago", () => {
    const from = new Date(resolveTimeRange({ preset: "today" }, NOW).from);
    expect([from.getHours(), from.getMinutes(), from.getSeconds()]).toEqual([0, 0, 0]);
    expect(from.getDate()).toBe(new Date(NOW).getDate());
  });

  it("walks back a calendar month, not 30 fixed days", () => {
    const from = new Date(resolveTimeRange({ preset: "1m" }, NOW).from);
    expect(from.getMonth()).toBe(7);
    expect(from.getDate()).toBe(4);
  });

  it("uses an explicit custom window", () => {
    const range = resolveTimeRange({ preset: "custom", from: "2026-01-01T00:00", to: "2026-01-02T12:00" });
    expect(range.from).toBe(new Date(2026, 0, 1, 0, 0).getTime());
    expect(range.to).toBe(new Date(2026, 0, 2, 12, 0).getTime());
  });

  it("falls back to 24h when a custom window is missing or inverted", () => {
    expect(resolveTimeRange({ preset: "custom" }, NOW)).toEqual({ from: NOW - DAY, to: NOW });
    const inverted = { preset: "custom" as const, from: "2026-02-02T00:00", to: "2026-02-01T00:00" };
    expect(resolveTimeRange(inverted, NOW)).toEqual({ from: NOW - DAY, to: NOW });
  });
});

describe("isCustomRangeValid", () => {
  it("requires both ends, in order", () => {
    expect(isCustomRangeValid({ preset: "custom", from: "2026-01-01T00:00", to: "2026-01-02T00:00" })).toBe(true);
    expect(isCustomRangeValid({ preset: "custom", from: "2026-01-02T00:00", to: "2026-01-01T00:00" })).toBe(false);
    expect(isCustomRangeValid({ preset: "custom", from: "2026-01-01T00:00" })).toBe(false);
    expect(isCustomRangeValid({ preset: "custom", from: "nonsense", to: "also nonsense" })).toBe(false);
  });
});

describe("toLocalDateTimeValue", () => {
  it("round-trips through a datetime-local input value", () => {
    const value = toLocalDateTimeValue(NOW);
    expect(value).toBe("2026-09-04T15:30");
    expect(new Date(value).getTime()).toBe(NOW);
  });
});

describe("since", () => {
  it("runs from the chosen start to now", () => {
    const from = "2026-09-01T08:00";
    const range = resolveTimeRange({ preset: "since", from }, NOW);
    expect(range.from).toBe(new Date(2026, 8, 1, 8, 0).getTime());
    expect(range.to).toBe(NOW);
  });

  it("falls back to 24h when the start is missing or in the future", () => {
    expect(resolveTimeRange({ preset: "since" }, NOW)).toEqual({ from: NOW - DAY, to: NOW });
    const future = { preset: "since" as const, from: "2099-01-01T00:00" };
    expect(resolveTimeRange(future, NOW)).toEqual({ from: NOW - DAY, to: NOW });
  });

  it("validates a past start", () => {
    expect(isSinceValid({ preset: "since", from: "2026-09-01T08:00" }, NOW)).toBe(true);
    expect(isSinceValid({ preset: "since", from: "2099-01-01T00:00" }, NOW)).toBe(false);
    expect(isSinceValid({ preset: "since" }, NOW)).toBe(false);
  });

  it("describes a since window", () => {
    expect(describeRange({ preset: "since", from: "2026-09-01T08:00" }, NOW)).toContain("Since");
  });
});

describe("describeRange", () => {
  it("describes a preset and a custom window differently", () => {
    expect(describeRange({ preset: "7d" }, NOW)).toContain("Last 7 days");
    expect(describeRange({ preset: "custom", from: "2026-01-01T00:00", to: "2026-01-02T00:00" })).toContain("→");
  });
});
