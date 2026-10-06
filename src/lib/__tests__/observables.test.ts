import { extractObservables, type ObservableKind } from "@/lib/observables";
import type { CaseAlert } from "@/lib/types";

const groupFor = (alerts: CaseAlert[], kind: ObservableKind) =>
  extractObservables(alerts).find((group) => group.kind === kind);

const values = (alerts: CaseAlert[], kind: ObservableKind) =>
  groupFor(alerts, kind)?.observables.map((o) => o.value) ?? [];

describe("extractObservables", () => {
  it("pulls each observable type from a matching field name", () => {
    const alerts: CaseAlert[] = [
      {
        _id: "a1",
        srcip: "10.0.0.5",
        remote_ip: "8.8.8.8",
        hostname: "WIN-DC01",
        srcuser: "jdoe",
        file_md5: "44d88612fea8a8f36de82e1278abb02f",
        url: "http://evil.example.com/payload.bin",
        sender_email: "admin@corp.example",
        dest_domain: "bad.example.org",
      },
    ];

    expect(values(alerts, "ip_private")).toEqual(["10.0.0.5"]);
    expect(values(alerts, "ip_public")).toEqual(["8.8.8.8"]);
    expect(values(alerts, "hostname")).toContain("win-dc01");
    expect(values(alerts, "username")).toContain("jdoe");
    expect(values(alerts, "hash")).toContain("44d88612fea8a8f36de82e1278abb02f");
    expect(values(alerts, "url")).toContain("http://evil.example.com/payload.bin");
    expect(values(alerts, "email")).toContain("admin@corp.example");
    expect(values(alerts, "domain")).toContain("bad.example.org");
  });

  it("ignores observable-shaped values in non-matching fields", () => {
    const alerts: CaseAlert[] = [
      { _id: "a1", msg: "user admin@corp.example logged in from 8.8.8.8 via http://x.example.com" },
    ];
    // No ip/user/email/url field name, so nothing is pulled from the free text.
    expect(groupFor(alerts, "ip_public")).toBeUndefined();
    expect(groupFor(alerts, "email")).toBeUndefined();
    expect(groupFor(alerts, "url")).toBeUndefined();
  });

  it("counts how many alerts each value appears in and sorts by that count", () => {
    const alerts: CaseAlert[] = [
      { _id: "a1", srcip: "1.1.1.1" },
      { _id: "a2", srcip: "1.1.1.1" },
      { _id: "a3", srcip: "2.2.2.2" },
    ];
    const ip = groupFor(alerts, "ip_public");
    expect(ip?.observables[0]).toEqual({ value: "1.1.1.1", count: 2 });
    expect(ip?.observables[1]).toEqual({ value: "2.2.2.2", count: 1 });
  });

  it("does not mistake file names for domains", () => {
    const alerts: CaseAlert[] = [{ _id: "a1", process_name: "mimikatz.exe" }];
    expect(values(alerts, "filename")).toContain("mimikatz.exe");
    expect(values(alerts, "domain")).toEqual([]);
  });

  it("reaches observables nested inside objects and arrays", () => {
    const alerts: CaseAlert[] = [
      { _id: "a1", event: { device: { hostname: "host-a" } }, dstips: ["9.9.9.9"] },
    ];
    expect(values(alerts, "hostname")).toContain("host-a");
    expect(values(alerts, "ip_public")).toContain("9.9.9.9");
  });

  it("treats MAC addresses as their own category, not IPs", () => {
    const alerts: CaseAlert[] = [{ _id: "a1", srcmac: "00:1A:2B:3C:4D:5E", dstip: "8.8.8.8" }];
    expect(values(alerts, "mac")).toEqual(["00:1a:2b:3c:4d:5e"]);
    expect(values(alerts, "ip_public")).toEqual(["8.8.8.8"]);
    // The MAC must not leak into either IP bucket.
    expect(groupFor(alerts, "ip_private")).toBeUndefined();
  });

  it("only accepts full or ::-compressed IPv6 (not loose colon-hex)", () => {
    const alerts: CaseAlert[] = [
      {
        _id: "a1",
        srcip: "2001:db8:85a3::8a2e:370:7334", // compressed, valid
        dstip: "fe80:1:2:3:4:5:6:7", // full 8 groups, valid (link-local)
        peer_ip: "1234:5678:9abc", // 3 groups, no "::", not 8 — not an IP
      },
    ];
    const ips = [...values(alerts, "ip_public"), ...values(alerts, "ip_private")];
    expect(ips).toContain("2001:db8:85a3::8a2e:370:7334");
    expect(ips).toContain("fe80:1:2:3:4:5:6:7");
    expect(ips).not.toContain("1234:5678:9abc");
  });

  it("extracts registry keys, geolocations and reputations, ignoring unknowns", () => {
    const alerts: CaseAlert[] = [
      {
        _id: "a1",
        registry_key: "HKLM\\Software\\Microsoft\\Run",
        geo_country: "United States",
        geo_city: "unknown",
        ip_reputation: "malicious",
        srcuser: "unknown",
      },
    ];
    expect(values(alerts, "registry")).toContain("HKLM\\Software\\Microsoft\\Run");
    expect(values(alerts, "geo")).toEqual(["United States"]);
    expect(values(alerts, "reputation")).toContain("malicious");
    // "unknown" values are ignored everywhere.
    expect(groupFor(alerts, "username")).toBeUndefined();
  });

  it("includes reputation values but not reputation_source fields", () => {
    const alerts: CaseAlert[] = [
      { _id: "a1", ip_reputation: "malicious", ip_reputation_source: "VendorX" },
    ];
    expect(values(alerts, "reputation")).toEqual(["malicious"]);
  });

  it("splits IPs into public and private using RFC1918 rules", () => {
    const alerts: CaseAlert[] = [
      { _id: "a1", ips: ["10.1.2.3", "172.16.5.5", "172.32.5.5", "192.168.1.1", "127.0.0.1", "8.8.4.4", "1.2.3.4"] },
    ];
    expect(values(alerts, "ip_private").sort()).toEqual(
      ["10.1.2.3", "127.0.0.1", "172.16.5.5", "192.168.1.1"].sort(),
    );
    // 172.32.x is outside the /12, so it is public.
    expect(values(alerts, "ip_public").sort()).toEqual(["1.2.3.4", "172.32.5.5", "8.8.4.4"].sort());
  });
});
