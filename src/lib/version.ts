// APP_VERSION is bumped automatically on each commit by .githooks/pre-commit
// (the patch/third digit increments). Edit CHANGELOG by hand to document a version.
export const APP_VERSION = "1.1.0";

export interface ChangelogEntry {
  version: string;
  date: string;
  notes: string[];
}

/** Newest first. Each documented version lists what changed in it. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.1.0",
    date: "2026-09-11",
    notes: [
      "First versioned release — rolls up the app to date.",
      "Per-instance tiles: open cases by severity, split by New / In Progress status.",
      "Sensor status (connected / disconnected, features) and connector status (active, healthy, issues).",
      "Case, sensor, and connector queries scoped to a tenant when one is selected.",
      "HTTPS with a self-signed certificate generated on first run; installable in Global settings.",
      "Login with administrator and read-only roles; user management in Global settings.",
      "Compact, collapsible, auto-sorted tiles that use the full window width.",
      "Duplicate an instance and derive the MCP endpoint from the server URL.",
      "Custom time window with Range and Since tabs and a calendar-button date picker.",
      "Alert pop-ups that expire (configurable, default 15s), dismiss, and highlight their tile.",
    ],
  },
];
