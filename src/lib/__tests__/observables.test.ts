import { extractObservables, type ObservableKind } from "@/lib/observables";
import type { CaseAlert } from "@/lib/types";

const groupFor = (alerts: CaseAlert[], kind: ObservableKind) =>
  extractObservables(alerts).find((group) => group.kind === kind);

const values = (alerts: CaseAlert[], kind: ObservableKind) =>
  groupFor(alerts, kind)?.observables.map((o) => o.value) ?? [];

describe("extractObservables", () => {
  it("pulls the major observable types from alert fields", () => {
    const alerts: CaseAlert[] = [
      {
        _id: "a1",
        srcip: "10.0.0.5",
        remote_ip: "8.8.8.8",
        hostname: "WIN-DC01",
        srcuser: "jdoe",
        file_hash: "44d88612fea8a8f36de82e1278abb02f",
        url: "http://evil.example.com/payload.bin",
        msg: "user admin@corp.example logged in from 10.0.0.5",
      },
    ];

    expect(values(alerts, "ip").sort()).toEqual(["10.0.0.5", "8.8.8.8"]);
    expect(values(alerts, "hostname")).toContain("win-dc01");
    expect(values(alerts, "username")).toContain("jdoe");
    expect(values(alerts, "email")).toContain("admin@corp.example");
    expect(values(alerts, "hash")).toContain("44d88612fea8a8f36de82e1278abb02f");
    expect(values(alerts, "url")).toContain("http://evil.example.com/payload.bin");
    // Domains come from the URL host and the email domain.
    expect(values(alerts, "domain")).toEqual(expect.arrayContaining(["evil.example.com", "corp.example"]));
  });

  it("counts how many alerts each value appears in and sorts by that count", () => {
    const alerts: CaseAlert[] = [
      { _id: "a1", srcip: "1.1.1.1" },
      { _id: "a2", srcip: "1.1.1.1" },
      { _id: "a3", srcip: "2.2.2.2" },
    ];
    const ip = groupFor(alerts, "ip");
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
    expect(values(alerts, "ip")).toContain("9.9.9.9");
  });
});
