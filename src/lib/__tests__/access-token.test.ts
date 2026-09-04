import { extractAccessToken } from "@/lib/mcp/access-token";

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature";

describe("extractAccessToken", () => {
  it("reads a plain access_token field", () => {
    expect(extractAccessToken({ access_token: TOKEN })?.token).toBe(TOKEN);
  });

  it("reads a token nested in MCP text content", () => {
    const content = [{ type: "text", text: JSON.stringify({ data: { access_token: TOKEN } }) }];
    expect(extractAccessToken(content)?.token).toBe(TOKEN);
  });

  it("accepts a bare token string", () => {
    expect(extractAccessToken(TOKEN)?.token).toBe(TOKEN);
  });

  it("honours expires_in, refreshing a minute early", () => {
    const result = extractAccessToken({ access_token: TOKEN, expires_in: 3600 });
    const minutes = Math.round(((result?.expiresAt ?? 0) - Date.now()) / 60_000);
    expect(minutes).toBe(59);
  });

  it("defaults to a short lifetime when the server says nothing", () => {
    const result = extractAccessToken({ access_token: TOKEN });
    expect((result?.expiresAt ?? 0) - Date.now()).toBeGreaterThan(60_000);
  });

  it("ignores short or whitespace-laden values", () => {
    expect(extractAccessToken({ access_token: "nope" })).toBeNull();
    expect(extractAccessToken("could not authenticate you")).toBeNull();
  });

  it("returns null when there is no token at all", () => {
    expect(extractAccessToken({ error: "unauthorized" })).toBeNull();
  });
});
