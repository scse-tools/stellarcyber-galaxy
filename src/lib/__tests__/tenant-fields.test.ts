import { buildTenantPayload, sampleTenantValues } from "@/lib/tenant-fields";

describe("buildTenantPayload", () => {
  it("keeps known fields, coerces types, and drops empties/unknowns", () => {
    const payload = buildTenantPayload({
      cust_name: "Sharks",
      contact_email: "ops@sharks.example",
      ingestion_limit: "500",
      mfa_enabled: "true",
      tenant_session_override: false,
      address: "",
      not_a_field: "ignored",
    });
    expect(payload).toEqual({
      cust_name: "Sharks",
      contact_email: "ops@sharks.example",
      ingestion_limit: 500,
      mfa_enabled: true,
      // an explicit boolean false is kept (so an unchecked box can turn a setting off)
      tenant_session_override: false,
    });
  });

  it("accepts real booleans and numbers from a form", () => {
    const payload = buildTenantPayload({ cust_name: "Main", mfa_enabled: true, session_timeout: 30 });
    expect(payload).toEqual({ cust_name: "Main", mfa_enabled: true, session_timeout: 30 });
  });

  it("drops a non-numeric ingestion_limit", () => {
    const payload = buildTenantPayload({ cust_name: "X", ingestion_limit: "abc" });
    expect(payload).toEqual({ cust_name: "X" });
  });
});

describe("sampleTenantValues", () => {
  it("uses generic placeholders and borrows numeric structure from an existing tenant", () => {
    const sample = sampleTenantValues([{ cust_name: "Real Corp", ingestion_limit: 500, session_timeout: 1800 }]);
    expect(sample.cust_name).toBe("Example Tenant");
    expect(sample.contact_email).toBe("jane.doe@example.com");
    expect(sample.ingestion_limit).toBe("500");
    expect(sample.session_timeout).toBe("1800");
  });

  it("falls back to defaults with no existing tenants", () => {
    const sample = sampleTenantValues([]);
    expect(sample.ingestion_limit).toBe("100");
    expect(sample.mfa_enabled).toBe("false");
  });
});
