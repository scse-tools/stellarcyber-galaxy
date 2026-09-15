// APP_VERSION is bumped automatically on each commit by .githooks/pre-commit
// (the patch/third digit increments). Edit CHANGELOG by hand to document a version.
export const APP_VERSION = "1.1.5";

export interface ChangelogEntry {
  version: string;
  date: string;
  notes: string[];
}

/** Newest first. Each documented version lists what changed in it. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.1.3",
    date: "2026-09-11",
    notes: ["Alert pop-ups now auto-dismiss after 5 seconds by default (still configurable)."],
  },
  {
    version: "1.1.2",
    date: "2026-09-11",
    notes: [
      "Instance config: the Tenant ID field is now a “Lock to tenant” dropdown of tenant names, defaulting to “All tenants” (no tenant filter).",
      "The tenant list is populated from the API key after Test connection.",
      "Tile tenant picker defaults to “All tenants”; when an instance is locked to a tenant the picker is disabled and shows that tenant, and the lock always wins server-side.",
    ],
  },
  {
    version: "1.1.1",
    date: "2026-09-11",
    notes: ["Added a 5HR option to the time picker, between 1HR and 12HR."],
  },
  {
    version: "1.1.0",
    date: "2026-09-11",
    notes: [
      "First versioned release — rolls up the app to date.",
      "Per-instance tiles: open cases by severity, split by New / In Progress status.",
      "Sensor status (connected / disconnected, features) and connector status (active, healthy, issues).",
      "MSSP tenant listing: scope a tile's case, sensor, and connector queries to a tenant.",
      "HTTPS with a self-signed certificate generated on first run; installable in Global settings.",
      "Login with administrator and read-only roles; user management in Global settings.",
      "Compact, collapsible, auto-sorted tiles that use the full window width.",
      "Duplicate an instance and derive the MCP endpoint from the server URL.",
      "Custom time window with Range and Since tabs and a calendar-button date picker.",
      "Alert pop-ups that expire, dismiss, and highlight their tile; a notifications panel keeps history.",
      "Clickable version number opening these release notes.",
    ],
  },
];
