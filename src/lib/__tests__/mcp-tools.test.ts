import {
  buildToolArgs,
  parseToolArgs,
  selectAccessTokenTool,
  selectCaseTool,
  supportsFilteredCounts,
  type McpToolLike,
} from "@/lib/mcp/tools";

const STELLAR_TOOLS: McpToolLike[] = [
  { name: "get_access_token", description: "Exchange a bearer token for an access token" },
  { name: "listCases", description: "List cases" },
  { name: "listAlerts", description: "List alerts" },
  { name: "create_case", description: "Create a new case" },
];

describe("selectAccessTokenTool", () => {
  it("finds Stellar Cyber's get_access_token", () => {
    expect(selectAccessTokenTool(STELLAR_TOOLS)?.name).toBe("get_access_token");
  });

  it("falls back to a differently named auth tool", () => {
    expect(selectAccessTokenTool([{ name: "authenticate" }])?.name).toBe("authenticate");
  });

  it("returns null when the server exposes no auth tool", () => {
    expect(selectAccessTokenTool([{ name: "listCases" }])).toBeNull();
  });
});

describe("selectCaseTool", () => {
  it("prefers the exact listCases tool", () => {
    expect(selectCaseTool(STELLAR_TOOLS)?.name).toBe("listCases");
  });

  it("never picks a mutating tool when guessing", () => {
    expect(selectCaseTool([{ name: "create_case", description: "Create a new case" }])).toBeNull();
  });

  it("falls back to wording when the name differs", () => {
    const tools: McpToolLike[] = [
      { name: "case_severity_counts", description: "Open case counts by severity" },
      { name: "search_cases", description: "Search cases" },
    ];
    expect(selectCaseTool(tools)?.name).toBe("case_severity_counts");
  });

  it("honours an explicit override", () => {
    expect(selectCaseTool(STELLAR_TOOLS, "listAlerts")?.name).toBe("listAlerts");
    expect(selectCaseTool(STELLAR_TOOLS, "missing")).toBeNull();
  });
});

describe("buildToolArgs", () => {
  it("sends the bearer token to get_access_token", () => {
    const tool: McpToolLike = {
      name: "get_access_token",
      inputSchema: { properties: { bearer_token: {} } },
    };
    expect(buildToolArgs(tool, { bearerToken: "BEARER" })).toEqual({ bearer_token: "BEARER" });
  });

  it("uses a plain `token` argument for the bearer when nothing better is declared", () => {
    const tool: McpToolLike = { name: "get_access_token", inputSchema: { properties: { token: {} } } };
    expect(buildToolArgs(tool, { bearerToken: "BEARER" })).toEqual({ token: "BEARER" });
  });

  it("sends the access token, not the bearer, to listCases", () => {
    const tool: McpToolLike = {
      name: "listCases",
      inputSchema: { properties: { access_token: {}, status: {}, limit: {} } },
    };
    expect(
      buildToolArgs(tool, { accessToken: "ACCESS", bearerToken: "BEARER", pageLimit: 1 }),
    ).toEqual({ access_token: "ACCESS", limit: 1 });
  });

  it("invents no status or severity of its own - only what the caller passes", () => {
    const tool: McpToolLike = {
      name: "listCases",
      inputSchema: { properties: { status: {}, severity: {} } },
    };
    expect(buildToolArgs(tool, { accessToken: "ACCESS" })).toEqual({});
    expect(buildToolArgs(tool, { status: "New", severity: "Critical" })).toEqual({
      status: "New",
      severity: "Critical",
    });
  });

  it("passes an explicit created-at window, since listCases defaults to 24h", () => {
    const tool: McpToolLike = {
      name: "listCases",
      inputSchema: { properties: { from_created_at: {}, to_created_at: {} } },
    };
    expect(buildToolArgs(tool, { fromCreatedAt: 0, toCreatedAt: 1788529310603 })).toEqual({
      from_created_at: 0,
      to_created_at: 1788529310603,
    });
  });

  it("uses cust_id for the tenant, which is what Stellar Cyber declares", () => {
    const tool: McpToolLike = { name: "listCases", inputSchema: { properties: { cust_id: {} } } };
    expect(buildToolArgs(tool, { tenantId: "t-42" })).toEqual({ cust_id: "t-42" });
  });

  it("only sends arguments the tool declares", () => {
    const tool: McpToolLike = { name: "listCases", inputSchema: { properties: { tenant_id: {} } } };
    expect(buildToolArgs(tool, { accessToken: "ACCESS", tenantId: "t-1" })).toEqual({
      tenant_id: "t-1",
    });
  });

  it("omits the tenant when the instance has none", () => {
    const tool: McpToolLike = { name: "listCases", inputSchema: { properties: { tenant_id: {} } } };
    expect(buildToolArgs(tool, { tenantId: null })).toEqual({});
  });

  it("lets explicit overrides win", () => {
    const tool: McpToolLike = { name: "listCases", inputSchema: { properties: { status: {} } } };
    expect(buildToolArgs(tool, { overrides: { status: "New", extra: 1 } })).toEqual({
      status: "New",
      extra: 1,
    });
  });
});

describe("supportsFilteredCounts", () => {
  it("is true for a tool that filters by both severity and status", () => {
    expect(
      supportsFilteredCounts({
        name: "listCases",
        inputSchema: { properties: { severity: {}, status: {} } },
      }),
    ).toBe(true);
  });

  it("is false when either filter is missing", () => {
    expect(
      supportsFilteredCounts({ name: "listCases", inputSchema: { properties: { status: {} } } }),
    ).toBe(false);
    expect(supportsFilteredCounts({ name: "listCases" })).toBe(false);
  });
});

describe("parseToolArgs", () => {
  it("accepts a JSON object and rejects anything else", () => {
    expect(parseToolArgs('{"a":1}')).toEqual({ a: 1 });
    expect(parseToolArgs("[1,2]")).toEqual({});
    expect(parseToolArgs("not json")).toEqual({});
    expect(parseToolArgs(null)).toEqual({});
  });
});
