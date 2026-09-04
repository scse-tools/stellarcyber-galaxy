# Stellar Cyber Galaxy

One tile per Stellar Cyber instance. Each tile talks to that instance's **MCP server**, and shows
the current count of **open cases** split into **Critical / High / Medium / Low**. Click a tile to
open a modal with the full breakdown and a link straight into that instance's console.

## Quick start

```bash
npm install
npm run keygen >> .env     # writes GALAXY_ENCRYPTION_KEY=<32 random bytes, base64>
npm run dev                # http://localhost:3000
```

Then click **Add instance** and fill in the console URL, the MCP endpoint, and the credentials.

## Run with Docker

The app ships as a small standalone image (Next.js standalone + Node 24, which provides
`node:sqlite` natively — no native builds, no Prisma engine downloads).

```bash
# 1. Provide the encryption key (once). Reuse your existing .env, or generate one:
echo "GALAXY_ENCRYPTION_KEY=$(openssl rand -base64 32)" > .env

# 2. Build and start.
docker compose up -d --build
# → http://localhost:3000
```

- **Persistence.** `docker-compose.yml` bind-mounts `./data` into the container, so the encrypted
  SQLite database — and every instance you configure — lives on the host and survives rebuilds. Your
  existing `./data/galaxy.db` is reused as-is (keep the matching `GALAXY_ENCRYPTION_KEY` in `.env`).
- **The key never enters the image.** `.dockerignore` excludes `.env` and `data`; the key is passed
  at runtime via `env_file`, and the database is a mounted volume.
- **Logs / status:** `docker compose logs -f` · `docker compose ps` (a healthcheck hits `/`).
- **Update:** `git pull && docker compose up -d --build`. **Stop:** `docker compose down`.
- **Behind a corporate proxy?** Uncomment `NODE_USE_ENV_PROXY` / `HTTPS_PROXY` in the compose file
  so the server can reach your Stellar Cyber instances.

Losing the key means the stored credentials cannot be decrypted, so back up `.env` alongside `data/`.

## How a tile gets its numbers

Every Stellar Cyber MCP server requires a two-step handshake, and each poll follows it:

1. A server route (`/api/instances/[id]/stats`) decrypts that instance's credentials.
2. It connects to the MCP endpoint — Streamable HTTP first, SSE as a fallback — presenting the
   configured credential as `Authorization: Bearer <token>` (or `Basic` for Basic auth).
3. It calls **`get_access_token`**. On Stellar Cyber this tool takes **no arguments** — it reads the
   bearer token from the request header — and returns `{ access_token, expires_in: 600 }`. The token
   is cached in memory until a minute before it expires, so one handshake serves many polls.
4. It calls **`listCases`** once per (severity, open status) pair with `limit: 1`, and reads
   `data.total` from each reply. Four severities x two open statuses = 8 small queries, issued
   concurrently on the same connection.
5. The eight totals are summed into the four severity buckets.

## Sensor status

Below the case counts, each tile carries a **Sensor status** block driven by the instance's REST API
(`GET /connect/api/v1/data_sensors`), categorized three ways with green = healthy, red = trouble:

| Category | Green when | Red when |
| --- | --- | --- |
| **Connection** | every sensor `connection_status` is `connected` | any sensor disconnected |
| **Upgrade** | no sensor has `need_upgrade` | any sensor needs an upgrade |
| **Feature** | informational — a breakdown by `feature` (WDS / DS / Modular / …), never red |

The REST API authenticates like the MCP server: the app trades the instance's API key for an access
token at `POST /connect/api/v1/access_token` (`Authorization: Bearer <api key>` →
`{access_token, exp}`), caches it until just before expiry, and uses it as the bearer on
`data_sensors` ([access-token.ts](src/lib/rest/access-token.ts),
[sensors.ts](src/lib/rest/sensors.ts)). A 401 forces one fresh-token retry. Sensor status reflects
current state, so it ignores the time-frame picker and refreshes on the same 60-second cycle as the
case counts.

## Time frame

A picker in the header sets the window every tile is counted over, and it maps directly onto the
`from_created_at` / `to_created_at` arguments of `listCases`:

| Selection | Window |
| --- | --- |
| **Today** | Local midnight → now (not a rolling 24h) |
| **1HR / 12HR / 24HR** | Rolling hours back from now |
| **7D / 14D** | Rolling days back from now |
| **1M** | One calendar month back (`setMonth(-1)`), not 30 fixed days |
| **Custom** | Opens a date + time picker for both ends; From must precede To |

Selections resolve to epoch milliseconds on the client, travel as `?from=&to=` on the stats
request, and are validated server-side ([range-params.ts](src/lib/mcp/range-params.ts)) before
reaching the tool call. The choice is remembered in `localStorage`, changing it re-polls every tile,
and the connection test uses the same window so its numbers match the tiles.

Measured against a live instance, one instance across windows:

```
1HR                total        3   C    0  H     0  M       2  L        1
12HR               total      140   C    3  H     1  M     120  L       16
24HR               total      322   C    3  H     5  M     251  L       63
7D                 total    2,157   C    5  H   258  M     605  L    1,289
14D                total    4,243   C   14  H   279  M     855  L    3,095
Today              total      133   C    3  H     1  M     117  L       12
```

### Why counting works this way

Three things about the real API make the naive approach wrong, all verified against a live instance:

- **Filter values are case-sensitive.** A case carries `status: "New"` and `severity: "Critical"`.
  Passing `status: "Open"` — or even the lowercase `"new"` that the tool's own schema documents —
  matches nothing and returns `total: 0` with no error.
- **`listCases` defaults to the last 24 hours.** Without an explicit `from_created_at` *and*
  `to_created_at`, the server silently scopes the query to cases created since yesterday. Every
  query therefore passes an explicit window (from epoch 0 to now).
- **Backlogs are far larger than one page.** A production instance answered with 225,123 cases in
  total, so tallying the severities inside a single page of results could never be accurate.
  Reading `data.total` per filter combination is exact at any size and needs no pagination.

Open status is `New` and `In Progress` by default; set `GALAXY_OPEN_STATUSES` if a deployment
customises its workflow. A tool that does not offer both `severity` and `status` filters falls back
to tallying one page locally, which also handles severity maps, Elasticsearch `buckets`
aggregations, numeric `severity_0..4` levels, and prose like `Critical: 4`.

Tool names can be overridden per instance under **Advanced tool override**. If the token handshake
fails, the cached token is dropped so the next poll retries cleanly.

Tiles refresh every 60 seconds, and on demand from the header or the detail modal.

## Testing a connection

Both the add/edit form and a tile's detail modal have a **Test** button. It runs the real sequence
and reports each step separately, so a failure says which part broke:

```
OK      Connect to MCP endpoint   Connected over streamable-http.
OK      List tools                3 tools · get_access_token present · listCases present
FAIL    get_access_token          get_access_token rejected the bearer token: invalid bearer token
SKIPPED listCases                 Skipped after an earlier failure.
```

In the form the button tests the values on screen **before** saving; blank secret fields fall back
to the credentials already stored for that instance. A test always performs a fresh handshake rather
than trusting a cached access token, and no token material is ever echoed back — only its length and
remaining lifetime.

## Console auto-login

Each instance's detail modal has a **Console session** panel:

- **Initialize session** signs in with the stored credentials (no typing).
- **Open console** then enters the authenticated dashboard directly, with no further login.

### How it works, and why it is two steps

The console authenticates with a cookie session, and its login page encrypts the password
client-side before posting it. The app reproduces that exactly:

1. The server reads the console's own JS bundle once and extracts its **login build hash** — the
   AES passphrase the login page uses ([build-hash.ts](src/lib/console/build-hash.ts)). Cached per
   origin; override it per instance under Advanced if discovery ever fails.
2. The server encrypts the password with that passphrase in the console's exact `CryptoJS.AES`
   format ([crypto-js-aes.ts](src/lib/console/crypto-js-aes.ts)) and POSTs
   `{name, email, password, buildHash}` to `/local/login/callback`, capturing the session cookie
   and verifying it with `GET /auth/is_authenticated`.
3. **Initialize** then plants that cookie in the *browser* by top-level POSTing the same login form
   into a small sign-in window. **Open console** afterwards navigates to the dashboard, which the
   console's own SPA loads already authenticated.

It is two steps because of how the console is defended, all confirmed against a live instance:

- Its session cookies are **`SameSite=Strict`**, so they can only be planted by a *top-level*
  navigation — an iframe or a background fetch would have the cookie dropped.
- Its login endpoint answers with **JSON, not a redirect**, and sends
  **`Cross-Origin-Opener-Policy: same-origin`**, which severs this app's handle to the sign-in
  window the moment it lands. So the app cannot silently redirect that window to the dashboard; a
  browser simply is not allowed to. The sign-in window therefore shows the raw login JSON — you can
  close it — and **Open console** reaches the dashboard through a fresh navigation instead.

On every refresh cycle the app also sends a **keepalive** (`/auth/is_authenticated`) to each
initialized console, and the panel shows **Active / Check session / Not initialized**.

The encoded password handed to the browser is precisely what the console's own login page posts —
reversible only with the public build hash — so nothing is exposed beyond typing the password into
that page yourself. Allow pop-ups for the app so the sign-in and console windows can open.

> A fully seamless, single-window auto-login (no sign-in tab) is not possible from a different
> origin against this console — its COOP + SameSite-Strict + JSON-login design forbids it. That
> would require a real-browser automation backend (e.g. Playwright) driving an actual Chromium.

## Credential storage## Credential storage

- SQLite at `data/galaxy.db` (override with `GALAXY_DB_PATH`) — persistent across restarts.
- Username, password, and API key are each sealed with **AES-256-GCM** before they are written. The
  envelope is `v1.<iv>.<tag>.<ciphertext>`, with authenticated additional data, so a tampered row
  fails to decrypt rather than decrypting to garbage.
- The master key lives only in `GALAXY_ENCRYPTION_KEY` (`.env`, gitignored). Lose it and the stored
  credentials are unrecoverable; rotate it by re-entering credentials.
- **No secret is ever sent to the browser.** `/api/instances` returns `hasPassword` / `hasApiKey`
  booleans; decryption happens only on the server, immediately before an outbound MCP request.
- Leaving the password/API key fields blank when editing keeps the values already on disk.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Jest unit tests (crypto, severity mapping, MCP payload parsing, tool selection, access-token extraction) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run keygen` | Print a fresh `GALAXY_ENCRYPTION_KEY=` line |

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `GALAXY_ENCRYPTION_KEY` | *(required)* | 32-byte base64 master key for credential encryption |
| `GALAXY_DB_PATH` | `./data/galaxy.db` | SQLite file location |
| `GALAXY_MCP_TIMEOUT_MS` | `15000` | Per-request MCP timeout |
| `GALAXY_REST_TIMEOUT_MS` | `15000` | Per-request REST (sensor) timeout |
| `GALAXY_OPEN_STATUSES` | `New,In Progress` | Case statuses counted as open (case-sensitive) |
| `GALAXY_CASE_HISTORY_FROM` | `0` | Epoch ms lower bound for `from_created_at` |
| `GALAXY_CASE_PAGE_LIMIT` | `1000` | Page size for the fallback tally path only |

## Design

Colors are the Stellar Cyber console's own design tokens, read from
`salesdemo.stellarcyber.cloud` (`--sc-color-bg: #080d23`, `--sc-color-bg--primary-surface: #0c1230`,
`--sc-color-border--secondary: #10325e`, `--sc-color-text-link: #5f92dd`, and the
`--severity-critical/high/medium/low` scale), plus the brand orange `#f69220` from
stellarcyber.ai. They live in `src/app/globals.css`.

## Notes

- Persistence uses Node's built-in `node:sqlite` (Node ≥ 22.5) rather than Prisma, so the app has no
  native build step and no engine download.
- This app trusts whoever can reach it — it has no login of its own. Run it on localhost, or put an
  authenticating proxy in front of it before exposing it.
