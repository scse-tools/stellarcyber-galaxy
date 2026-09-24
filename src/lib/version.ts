// APP_VERSION is bumped automatically on each commit by .githooks/pre-commit
// (the patch/third digit increments). Edit CHANGELOG by hand to document a version.
export const APP_VERSION = "3.0.11";

export interface ChangelogEntry {
  version: string;
  date: string;
  notes: string[];
}

/** Newest first. Each documented version lists what changed in it. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "3.0.11",
    date: "2026-09-24",
    notes: [
      "Onboarding create: the connector conf now carries only the templated config fields present in the CSV, so untemplated fields (e.g. log_type) are no longer sent and rejected by the API.",
    ],
  },
  {
    version: "3.0.10",
    date: "2026-09-24",
    notes: [
      "Onboarding batch now persists across reloads (the uploaded CSV, edits and per-row statuses are saved).",
      "Added Delete batch (clear the whole table) and per-row delete.",
    ],
  },
  {
    version: "3.0.9",
    date: "2026-09-24",
    notes: [
      "Onboarding batch: rows are editable, and each can be created on the template's server. Pick the template, then Create all (with Pause/Continue) or run a single row; each row's tenant_name resolves to cust_id and its values build the /connect/api/v1/connectors payload.",
      "The Status column shows Success, or Failed with the connector API's error detail, per row.",
    ],
  },
  {
    version: "3.0.8",
    date: "2026-09-24",
    notes: [
      "Onboarding Studio: upload a filled onboarding CSV to mirror it in a table with a Status column (empty for now). Row-by-row batch creation is the next step.",
    ],
  },
  {
    version: "3.0.7",
    date: "2026-09-24",
    notes: [
      "Template modal (create and edit) can now add custom configuration fields (e.g. api_key, secrets) that the connector data doesn't return; added fields are mutable and appear as columns in the clone CSV.",
    ],
  },
  {
    version: "3.0.6",
    date: "2026-09-24",
    notes: [
      "Onboarding Studio: the Templates table is always shown (with a prompt when empty), and the server picker now sits below it on the left with the Select as Template button beside it.",
    ],
  },
  {
    version: "3.0.5",
    date: "2026-09-23",
    notes: [
      "Onboarding Studio: each connector column header now has a searchable dropdown that filters the table to the chosen value; the Version column was removed.",
    ],
  },
  {
    version: "3.0.4",
    date: "2026-09-23",
    notes: ["Saved templates are now editable — the Templates table has an edit action to rename and change the mutable fields."],
  },
  {
    version: "3.0.3",
    date: "2026-09-23",
    notes: [
      "Template field selection is now scoped to filter_list, name and run_on, plus an expandable configuration section that lists every config sub-field as its own mutable option.",
    ],
  },
  {
    version: "3.0.2",
    date: "2026-09-23",
    notes: [
      "Renamed Connector Studio to Onboarding Studio.",
      "Pick a connector with the row radio and Select as Template: name it and choose which fields are mutable (URL, credentials, tenant, …).",
      "Saved templates are retained and listed above the connector table, each with a downloadable clone CSV (tenant_name + the mutable fields).",
    ],
  },
  {
    version: "3.0.1",
    date: "2026-09-23",
    notes: [
      "New Connector Studio mode (left-nav item): pick a server from the top-right dropdown (reusing its saved settings/API key) to list all its connectors, sorted by type, tenant, then name. Click a row for the connector detail view.",
    ],
  },
  {
    version: "2.0.11",
    date: "2026-09-23",
    notes: [
      "Cases and Deployment health moved from a header toggle into a collapsible left-hand menu, each as its own item (ready for more sections later).",
    ],
  },
  {
    version: "2.0.10",
    date: "2026-09-22",
    notes: [
      "Tile data (case stats, sensor and connector status) is now pooled server-side with a short cache and request de-duplication, so concurrent viewers share one upstream call per tile instead of each polling the consoles independently.",
    ],
  },
  {
    version: "2.0.9",
    date: "2026-09-21",
    notes: [
      "Column filter: picking an exact value now matches by equality, so e.g. \"connected\" no longer also matches \"disconnected\".",
      "Each column filter box now has a clear (×) button to reset it and reopen the value list.",
    ],
  },
  {
    version: "2.0.8",
    date: "2026-09-21",
    notes: ["Fixed the Stellar Cyber logo (and other /public assets) missing in the Docker image — the runtime stage now copies public/."],
  },
  {
    version: "2.0.7",
    date: "2026-09-21",
    notes: ["The inventory window now opens tall and pinned near the top of the screen instead of vertically centered."],
  },
  {
    version: "2.0.6",
    date: "2026-09-21",
    notes: [
      "Each tile (and table row) now has a pin icon that keeps it at the top of the order; pins persist across sessions.",
    ],
  },
  {
    version: "2.0.5",
    date: "2026-09-17",
    notes: [
      "Sensor default columns now include bytes in/out, service status, and sensor profile.",
      "Connector default columns now include status message and last activity.",
    ],
  },
  {
    version: "2.0.4",
    date: "2026-09-17",
    notes: ["Sensor timestamp fields (e.g. last_stats_time) now show as readable dates in the table and detail view."],
  },
  {
    version: "2.0.3",
    date: "2026-09-17",
    notes: [
      "Sensor inventory: the cust_name column is now labelled tenant_name.",
      "Sensor CPU and disk usage show as inline 0–100 status bars with the value, still sortable by real value.",
      "Connector timestamp columns (created, modified, last activity, last data received, status time) now show readable dates instead of epochs.",
    ],
  },
  {
    version: "2.0.2",
    date: "2026-09-17",
    notes: [
      "Clicking a connector row opens a graphical detail view: health/active/collect/respond pills, last-data-received and last-activity freshness, all fields, and a pretty-printed configuration.",
    ],
  },
  {
    version: "2.0.1",
    date: "2026-09-17",
    notes: [
      "Inventory table headers are now opaque, so rows scroll cleanly behind them instead of showing through.",
      "Sensor bytes in/out are shown as KB/MB/GB while still sorting by their real value.",
      "Clicking a sensor row opens a graphical detail view with status pills, CPU/disk bars, throughput, and all fields.",
    ],
  },
  {
    version: "1.1.21",
    date: "2026-09-16",
    notes: ["The header now shows the Stellar Cyber logo in the upper left."],
  },
  {
    version: "1.1.20",
    date: "2026-09-16",
    notes: [
      "Sensor feedback is now pretty-printed, and its epoch timestamps are shown as readable dates.",
      "Sensors gain an “oldest timestamp” column populated from the earliest timestamp in their feedback.",
      "The expanded row view renders multi-line values (like feedback) as a formatted block.",
    ],
  },
  {
    version: "1.1.19",
    date: "2026-09-16",
    notes: [
      "Each inventory column filter box now offers a dropdown of that column's distinct values to pick from, in addition to free-text search.",
    ],
  },
  {
    version: "1.1.18",
    date: "2026-09-16",
    notes: [
      "Inventory column show/hide choices now persist across sessions (saved per sensors/connectors tab in the browser).",
    ],
  },
  {
    version: "1.1.17",
    date: "2026-09-16",
    notes: [
      "The sensor/connector inventory now opens as a lighter floating overlay instead of a blocking modal — it no longer dims and locks the page, and disappears the moment you click away or press Escape.",
    ],
  },
  {
    version: "1.1.16",
    date: "2026-09-16",
    notes: [
      "Deployment health tiles now show aggregate sensor CPU and disk usage as 0–100 status bars (coloured by load), plus total bytes in and out.",
    ],
  },
  {
    version: "1.1.15",
    date: "2026-09-16",
    notes: [
      "Connector inventory now shows a Tenant name column, mapped from each connector's tenant id.",
      "The connector Status object is broken out into individual status_* columns (status_code, status_message, …) that sort, filter and colour like any other field.",
    ],
  },
  {
    version: "1.1.14",
    date: "2026-09-15",
    notes: [
      "Inventory rows now have an expander: click the chevron to reveal every field of that record, grouped by section.",
      "Each field in the expanded view has a show/hide toggle that adds or removes it as a table column.",
    ],
  },
  {
    version: "1.1.13",
    date: "2026-09-15",
    notes: [
      "Inventory tables now have a column picker: sensible defaults (name, IP, tenant, status, and other key fields) show by default, and every other field can be turned on or off.",
      "Every column is now sortable (click the header) and filterable (per-column search box).",
      "Grid ↔ table layout toggle for both Cases and Deployment health views; case table columns are colour-coded by severity.",
      "Clicking a sensor or connector status opens the inventory table pre-filtered to that status.",
      "Tenant picker is sorted alphabetically with a search box.",
    ],
  },
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
