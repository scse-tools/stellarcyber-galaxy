import { extractTotal, totalFromResult } from "@/lib/mcp/case-totals";

describe("extractTotal", () => {
  it("reads Stellar Cyber's { data: { total, cases } } envelope", () => {
    expect(extractTotal({ data: { total: 209, cases: [] } })).toBe(209);
  });

  it("reads a top-level total", () => {
    expect(extractTotal({ total: 17 })).toBe(17);
  });

  it("parses a JSON string", () => {
    expect(extractTotal('{"data":{"total":834}}')).toBe(834);
  });

  it("keeps a legitimate zero rather than treating it as missing", () => {
    expect(extractTotal({ data: { total: 0, cases: [] } })).toBe(0);
  });

  it("returns null when there is no total", () => {
    expect(extractTotal({ data: { cases: [] } })).toBeNull();
    expect(extractTotal("unauthorized")).toBeNull();
  });
});

describe("totalFromResult", () => {
  it("reads the total out of MCP text content", () => {
    const result = { content: [{ type: "text", text: '{"data":{"total":214,"cases":[]}}' }] };
    expect(totalFromResult(result)).toBe(214);
  });

  it("prefers structuredContent when present", () => {
    const result = {
      structuredContent: { data: { total: 5 } },
      content: [{ type: "text", text: '{"data":{"total":999}}' }],
    };
    expect(totalFromResult(result)).toBe(5);
  });

  it("returns null for an error reply", () => {
    expect(totalFromResult({ content: [{ type: "text", text: "access token expired" }] })).toBeNull();
  });
});
