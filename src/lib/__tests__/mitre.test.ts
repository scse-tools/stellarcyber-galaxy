import { buildTtpIndex, extractTtps, ttpKey, ttpUrl } from "@/lib/mitre";
import type { CaseAlert } from "@/lib/types";

describe("mitre TTP extraction", () => {
  const alerts: CaseAlert[] = [
    { _id: "a1", xdr_event: { tactic: { id: "TA0006", name: "Credential Access" }, technique: { id: "T1110", name: "Brute Force" } } },
    { _id: "a2", xdr_event: { technique: { id: "T1110", name: "Brute Force" } } },
    { _id: "a3", xdr_event: { technique: "T1059.001 PowerShell" } },
  ];

  it("pools tactics and techniques from xdr_event", () => {
    const ttps = extractTtps(alerts);
    const labels = ttps.map((t) => `${t.kind}:${t.id}`);
    expect(labels).toEqual(expect.arrayContaining(["tactic:TA0006", "technique:T1110", "technique:T1059.001"]));
  });

  it("maps each TTP to the alerts that carry it", () => {
    const { byTtp } = buildTtpIndex(alerts);
    const brute = byTtp.get(ttpKey({ kind: "technique", id: "T1110", name: "Brute Force" }));
    expect([...(brute ?? [])].sort()).toEqual(["a1", "a2"]);
  });

  it("builds MITRE links for technique and sub-technique ids", () => {
    expect(ttpUrl({ kind: "technique", id: "T1110", name: "" })).toBe("https://attack.mitre.org/techniques/T1110");
    expect(ttpUrl({ kind: "technique", id: "T1059.001", name: "" })).toBe("https://attack.mitre.org/techniques/T1059/001");
    expect(ttpUrl({ kind: "tactic", id: "TA0006", name: "" })).toBe("https://attack.mitre.org/tactics/TA0006");
  });
});
