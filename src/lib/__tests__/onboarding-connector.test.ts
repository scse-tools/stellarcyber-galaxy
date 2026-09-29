import { buildConnectorPayload } from "@/lib/onboarding-connector";

// Base connector fields (as produced from a catalog definition).
const base: Record<string, unknown> = {
  name: "",
  type: "sentinelone",
  category: "endpoint",
  is_collect: true,
  is_respond: true,
  run_on: "dp",
  filter_list: [],
  advanced_setting: false,
  configuration: JSON.stringify({ host: "https://old.example", hosts: true, api_key: "" }),
};

describe("buildConnectorPayload", () => {
  it("maps tenant to cust_id, keeps type/category keys, and puts config under conf", () => {
    const payload = buildConnectorPayload(base, true, {
      tenant_name: "Sharks",
      type: "sentinelone",
      category: "endpoint",
      name: "S1 for Sharks",
      "configuration.host": "https://sharks.sentinelone.net",
      "configuration.api_key": "SECRET123",
    }, "cust-abc");

    expect(payload.cust_id).toBe("cust-abc");
    expect(payload.name).toBe("S1 for Sharks");
    expect(payload.type).toBe("sentinelone");
    expect(payload.category).toBe("endpoint");
    expect(payload.is_collect).toBe(true);
    expect(payload.run_on).toBe("dp");
    expect(payload.filter_list).toEqual([]);
    expect(payload.advanced_setting).toBe(false);
    // includeAllConfig keeps every default; host/api_key overridden by the row.
    expect(payload.conf).toEqual({
      host: "https://sharks.sentinelone.net",
      hosts: true,
      api_key: "SECRET123",
    });
  });

  it("includes only config fields in the row when includeAllConfig is false", () => {
    const payload = buildConnectorPayload(base, false, { tenant_name: "Main", "configuration.host": "https://x" }, "cust-1");
    expect(payload.conf).toEqual({ host: "https://x" });
  });

  it("keeps base values when a top-level field is left blank", () => {
    const payload = buildConnectorPayload(base, true, { tenant_name: "Main", name: "" }, "cust-1");
    expect(payload.name).toBe("");
    expect(payload.type).toBe("sentinelone");
  });

  it("coerces config values to the base field's type", () => {
    const payload = buildConnectorPayload(base, true, { tenant_name: "Main", "configuration.hosts": "false" }, "cust-1");
    expect((payload.conf as Record<string, unknown>).hosts).toBe(false);
  });

  it("applies top-level overrides (is_collect) from the row", () => {
    const payload = buildConnectorPayload(base, true, { tenant_name: "Main", is_collect: "false" }, "c");
    expect(payload.is_collect).toBe(false);
    expect(payload.is_respond).toBe(true); // untouched -> base
  });
});
