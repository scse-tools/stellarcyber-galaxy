import { buildConnectorPayload } from "@/lib/onboarding-connector";
import type { ConnectorTemplate } from "@/lib/connector-templates";

const template: ConnectorTemplate = {
  id: "t1",
  name: "S1 onboarding",
  instanceId: "i1",
  instanceName: "COE",
  connectorType: "sentinelone",
  connectorName: "SentinelOne Connector",
  fields: {
    name: "SentinelOne Connector",
    type: "sentinelone",
    category: "endpoint",
    is_collect: true,
    is_respond: true,
    run_on: "dp",
    filter_list: [],
    advanced_setting: false,
    configuration: JSON.stringify({ host: "https://old.example", hosts: true, api_key: "" }),
  },
  mutableFields: ["name", "configuration.host", "configuration.api_key"],
  createdAt: "2026-09-24T00:00:00.000Z",
};

describe("buildConnectorPayload", () => {
  it("maps tenant to cust_id, overrides mutable fields, and puts config under conf", () => {
    const payload = buildConnectorPayload(
      template,
      {
        tenant_name: "Sharks",
        name: "S1 for Sharks",
        "configuration.host": "https://sharks.sentinelone.net",
        "configuration.api_key": "SECRET123",
      },
      "cust-abc",
    );

    expect(payload.cust_id).toBe("cust-abc");
    expect(payload.name).toBe("S1 for Sharks");
    expect(payload.type).toBe("sentinelone");
    expect(payload.category).toBe("endpoint");
    expect(payload.is_collect).toBe(true);
    expect(payload.run_on).toBe("dp");
    expect(payload.filter_list).toEqual([]);
    expect(payload.advanced_setting).toBe(false);
    expect(payload.conf).toEqual({
      host: "https://sharks.sentinelone.net",
      hosts: true,
      api_key: "SECRET123",
    });
  });

  it("keeps base values when a row leaves a mutable field blank", () => {
    const payload = buildConnectorPayload(template, { tenant_name: "Main", name: "" }, "cust-1");
    expect(payload.name).toBe("SentinelOne Connector");
    expect((payload.conf as Record<string, unknown>).host).toBe("https://old.example");
  });

  it("coerces config values to the base field's type", () => {
    const payload = buildConnectorPayload(
      template,
      { tenant_name: "Main", "configuration.hosts": "false" },
      "cust-1",
    );
    expect((payload.conf as Record<string, unknown>).hosts).toBe(false);
  });
});
