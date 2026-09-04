import { sharesOf, toSeverity, totalOf } from "@/lib/severity";

describe("toSeverity", () => {
  it("normalises the labels a Stellar Cyber MCP server might emit", () => {
    expect(toSeverity("Critical")).toBe("critical");
    expect(toSeverity("  HIGH ")).toBe("high");
    expect(toSeverity("severity_medium")).toBe("medium");
    expect(toSeverity("Informational")).toBe("low");
    expect(toSeverity(4)).toBe("critical");
    expect(toSeverity(0)).toBe("low");
  });

  it("returns null for anything unrelated", () => {
    expect(toSeverity("hostname")).toBeNull();
    expect(toSeverity(null)).toBeNull();
    expect(toSeverity("")).toBeNull();
  });
});

describe("totals and shares", () => {
  const counts = { critical: 1, high: 1, medium: 2, low: 0 };

  it("sums every bucket", () => {
    expect(totalOf(counts)).toBe(4);
  });

  it("computes shares that add up to one", () => {
    const shares = sharesOf(counts);
    expect(shares.medium).toBeCloseTo(0.5);
    expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("does not divide by zero on an empty galaxy", () => {
    expect(sharesOf({ critical: 0, high: 0, medium: 0, low: 0 }).critical).toBe(0);
  });
});
