// APP_VERSION is bumped automatically on each commit by .githooks/pre-commit
// (the patch/third digit increments). Edit CHANGELOG by hand to document a version.
export const APP_VERSION = "3.5.3";

export interface ChangelogEntry {
  version: string;
  date: string;
  notes: string[];
}

/** Newest first. Each documented version lists what changed in it. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "3.5.3",
    date: "2026-09-30",
    notes: [
      "DNS source now falls back to the host's system resolver when DNS-over-HTTPS is unreachable, so it still works in restricted-egress environments.",
    ],
  },
  {
    version: "3.5.2",
    date: "2026-09-30",
    notes: [
      "Investigation results now show, per observable, every source checked with a status (finding / clean / info / no data / error) and the detail behind it, plus a coverage line and the AI assessment.",
      "Added a Test button per threat-intel source so you can check reachability and see the exact failure.",
    ],
  },
  {
    version: "3.5.1",
    date: "2026-09-30",
    notes: [
      "Added a Test button per LLM provider in settings — makes a tiny live call and shows success or the real error (e.g. connection refused, DNS, blocked host) instead of a bare \"fetch failed\".",
      "Investigation run errors now surface the underlying network cause too.",
      "Seeded Ollama default model is now llama3.2.",
    ],
  },
  {
    version: "3.5.0",
    date: "2026-09-30",
    notes: [
      "Added a keyless local Ollama LLM provider, seeded as the default so investigations work out of the box (with Ollama running locally).",
      "Cloud providers (Claude, ChatGPT, Gemini) and custom OpenAI-compatible endpoints can still be added; only cloud providers require an API key.",
    ],
  },
  {
    version: "3.4.0",
    date: "2026-09-30",
    notes: [
      "Threat-intel enrichment now runs keyless by default: IPWHOIS, RDAP, DNS-over-HTTPS and crt.sh query automatically with no API key.",
      "Premium sources (VirusTotal, AbuseIPDB, GreyNoise, Shodan) stay optional — add an API key to activate them.",
      "You can now add your own custom premium sources (URL template + optional auth header/key) that apply to the observable types you choose.",
      "Settings group sources into Keyless, Premium and Custom.",
    ],
  },
  {
    version: "3.3.0",
    date: "2026-09-30",
    notes: [
      "Investigation Workspace: observables can now be selected and sent to an AI agent for threat-intel investigation.",
      "Hybrid enrichment — live source lookups (VirusTotal, AbuseIPDB, GreyNoise, Shodan) where an API key is configured, plus LLM synthesis with an overall verdict, summary and recommendation.",
      "Choose the LLM provider: Claude (Anthropic), ChatGPT (OpenAI), Gemini (Google) or a custom OpenAI-compatible endpoint; keys are stored encrypted.",
      "Investigations are retained as artifacts; add evidence as notes, links and screenshots attached to the case's session.",
      "Investigated cases show a shield insignia in the cases band and can be filtered (all / investigated / not).",
    ],
  },
  {
    version: "3.2.4",
    date: "2026-09-30",
    notes: [
      "Observables now split IP addresses into Public and Private groups (RFC1918, plus loopback and link-local).",
    ],
  },
  {
    version: "3.2.3",
    date: "2026-09-30",
    notes: [
      "Fixed the Investigation Workspace time filter: case timestamps are epoch milliseconds, which were being parsed as dates and dropped — no cases showed. Timestamps are now normalised to epoch ms server-side.",
      "Raised the cases fetch limit to 500 so wider time windows have more to filter.",
    ],
  },
  {
    version: "3.2.2",
    date: "2026-09-30",
    notes: [
      "Investigation Workspace: cases list is sorted by score (highest first) with a title search box.",
      "Added a time picker that filters cases by creation time, matching the main case board.",
      "New Observables section pools IPs, domains, hostnames, usernames, emails, URLs, file names and hashes from all of a case's alerts.",
      "Alert fidelity is now shown as a rounded integer.",
    ],
  },
  {
    version: "3.2.1",
    date: "2026-09-30",
    notes: [
      "Investigation Workspace: pick a server chip to load its cases in a left-hand band (score, title, alert count, status).",
      "Selecting a case shows its metadata and a table of alerts with show/hide, drag-to-reorder, sortable, and persistent columns.",
      "Added a Threat Intel panel listing the major OSINT sources (source configuration comes next).",
    ],
  },
  {
    version: "3.2.0",
    date: "2026-09-30",
    notes: ["Added an Investigation Workspace main-menu item (scaffold — being built out)."],
  },
  {
    version: "3.1.8",
    date: "2026-09-29",
    notes: ["Onboarding Studio: the New template from catalog button and the batch's server picker are now left-aligned; other controls unchanged."],
  },
  {
    version: "3.1.7",
    date: "2026-09-29",
    notes: [
      "Editing a template now uses the same full catalog form as creating one (loaded from the connector definition and prefilled with the saved values); edited default values are saved.",
    ],
  },
  {
    version: "3.1.6",
    date: "2026-09-29",
    notes: [
      "Catalog template form now includes connection/secret fields (common_fields like host, api_key) and nested child fields — no fields are dropped.",
      "True/false fields are now dropdowns; the form is laid out in two columns and shows every field (no per-field select/deselect — all fields except type/category are templated).",
    ],
  },
  {
    version: "3.1.5",
    date: "2026-09-29",
    notes: [
      "Rebuilt the catalog template creation as a full form: each field shows its label, description, type-appropriate input and default value from the catalog, with a mutable checkbox; type/category are shown as immutable keys.",
    ],
  },
  {
    version: "3.1.4",
    date: "2026-09-29",
    notes: [
      "type and category are now immutable keys (shown in the template dialog, always included as CSV columns) used to identify the connector to build.",
      "Creating a template from the catalog no longer asks for a server — templates are server-agnostic.",
      "The onboarding batch no longer picks a template; each row's type/category identify the connector via the catalog, so you only choose the target server to install to.",
    ],
  },
  {
    version: "3.1.3",
    date: "2026-09-29",
    notes: [
      "Template dialog now shows every connector field: name, type, category, is_collect, is_respond, run_on, filter_list and advanced_setting (all overridable per clone), plus a note that the tenant is set by the required tenant_name column (→ cust_id).",
      "Catalog templates retain the catalog's default values for fields you don't override; connector creation applies overrides for all top-level fields and any config field.",
    ],
  },
  {
    version: "3.1.2",
    date: "2026-09-29",
    notes: [
      "Catalog templates now start with every field shown and selected (untick to exclude); the add-custom-field option is hidden since the catalog already lists all fields.",
      "Removed the “Select as Template” flow from the existing-connectors table; that table (and its detail popup) remain for reference only. Create templates from the catalog instead.",
    ],
  },
  {
    version: "3.1.1",
    date: "2026-09-29",
    notes: [
      "New template from catalog: build a connector template from Stellar's connector definitions — pick the connector type from a searchable dropdown and the target server, then choose the mutable fields.",
    ],
  },
  {
    version: "3.0.17",
    date: "2026-09-25",
    notes: [
      "Tenant batch: download a CSV template (one sample row, sanitized from existing tenants), add rows manually, and edit any cell before creating.",
    ],
  },
  {
    version: "3.0.16",
    date: "2026-09-25",
    notes: [
      "Tenants table now shows all tenant fields with a persistent column selector, per-column search, a Refresh button, and a per-row Edit action — consistent with the other tables.",
    ],
  },
  {
    version: "3.0.15",
    date: "2026-09-25",
    notes: ["Tenants mode lists tenants in a table with a per-row Edit action instead of a dropdown."],
  },
  {
    version: "3.0.14",
    date: "2026-09-25",
    notes: [
      "Tenants mode: create or modify a single tenant directly (form), and batch-create tenants from a CSV (cust_name required) with the same editable table, Status column, Create all / Pause / Continue and per-row Run as connectors.",
    ],
  },
  {
    version: "3.0.13",
    date: "2026-09-25",
    notes: [
      "Onboarding Studio now has a mode selector at the top: Connectors (the existing functionality) and Tenants (coming soon).",
    ],
  },
  {
    version: "3.0.12",
    date: "2026-09-24",
    notes: [
      "Template modal hides the log_type config field (not shown, not selectable).",
      "Onboarding Studio layout: the onboarding batch table sits above the connector list; the server picker, Select as Template button and connector list are now at the bottom.",
    ],
  },
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
