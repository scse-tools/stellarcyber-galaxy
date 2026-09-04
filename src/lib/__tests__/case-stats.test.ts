import { extractCaseStats, fromText, normalizeSeverityCounts } from "@/lib/case-stats";

describe("normalizeSeverityCounts", () => {
  it("reads a plain severity map", () => {
    expect(normalizeSeverityCounts({ critical: 2, high: 5, medium: 1, low: 0 })).toEqual({
      critical: 2,
      high: 5,
      medium: 1,
      low: 0,
    });
  });

  it("reads capitalised keys wrapping counts", () => {
    expect(normalizeSeverityCounts({ Critical: { count: 3 }, High: { count: 1 } })).toEqual({
      critical: 3,
      high: 1,
      medium: 0,
      low: 0,
    });
  });

  it("reads an Elasticsearch severity aggregation", () => {
    const payload = {
      aggregations: {
        by_severity: {
          buckets: [
            { key: "Critical", doc_count: 4 },
            { key: "Medium", doc_count: 7 },
          ],
        },
      },
    };
    expect(normalizeSeverityCounts(payload)).toEqual({
      critical: 4,
      high: 0,
      medium: 7,
      low: 0,
    });
  });

  it("tallies a list of cases that only carry a severity label", () => {
    const cases = [{ severity: "High" }, { severity: "High" }, { severity: "low" }];
    expect(normalizeSeverityCounts(cases)).toEqual({
      critical: 0,
      high: 2,
      medium: 0,
      low: 1,
    });
  });

  it("maps the console's numeric severity levels", () => {
    expect(normalizeSeverityCounts([{ severity: 4, count: 2 }, { severity: 2, count: 3 }])).toEqual({
      critical: 2,
      high: 0,
      medium: 3,
      low: 0,
    });
  });

  it("skips cases whose status is no longer open", () => {
    const cases = [
      { severity: "Critical", status: "New" },
      { severity: "Critical", status: "Resolved" },
      { severity: "High", status: "In Progress" },
      { severity: "Low", status: "Cancelled" },
    ];
    expect(normalizeSeverityCounts(cases)).toEqual({
      critical: 1,
      high: 1,
      medium: 0,
      low: 0,
    });
  });

  it("returns null when nothing looks like severity counts", () => {
    expect(normalizeSeverityCounts({ hosts: 4, alerts: 9 })).toBeNull();
  });
});

describe("fromText", () => {
  it("parses prose replies", () => {
    expect(fromText("Critical: 1, High: 2, Medium: 0, Low: 6")).toEqual({
      critical: 1,
      high: 2,
      medium: 0,
      low: 6,
    });
  });
});

describe("extractCaseStats", () => {
  it("prefers structuredContent", () => {
    const result = {
      structuredContent: { counts: { critical: 1, high: 2, medium: 3, low: 4 } },
      content: [{ type: "text", text: "ignored" }],
    };
    expect(extractCaseStats(result)).toEqual({ critical: 1, high: 2, medium: 3, low: 4 });
  });

  it("falls back to JSON inside a text block", () => {
    const result = {
      content: [{ type: "text", text: '{"severity_counts":{"Critical":9,"Low":1}}' }],
    };
    expect(extractCaseStats(result)).toEqual({ critical: 9, high: 0, medium: 0, low: 1 });
  });

  it("returns null for an unusable result", () => {
    expect(extractCaseStats({ content: [{ type: "text", text: "no data" }] })).toBeNull();
  });
});
