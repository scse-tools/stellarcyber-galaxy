# Stellar Cyber Galaxy

One tile per Stellar Cyber instance. Each tile talks to that instance's **MCP server** for the
current count of **open cases** by **Critical / High / Medium / Low**, and its **REST API** for
**sensor status**. The app is served over **HTTPS** and requires a **login**; access is split into
administrator and read-only roles.

## Quick start

```bash
npm install
npm run keygen >> .env     # writes GALAXY_ENCRYPTION_KEY=<32 random bytes, base64>
npm run dev                # https://localhost:3000  (self-signed cert on first run)
```

On first visit you'll be asked to **create the administrator account**, then to sign in. As an
admin, click **Add instance** to configure the console URL, MCP endpoint, and API key; each tile's
**gear icon** reopens that window to edit, re-test, or remove the instance. The header gear (right of
Add instance) opens **Global settings** — user accounts and the TLS certificate.

The browser will warn about the self-signed certificate until you install your own (Global settings →
TLS certificate).

## Run with Docker

The app runs as a custom HTTPS Node server on Node 24 (which provides `node:sqlite` natively — no
native builds, no Prisma engine downloads).

```bash
# 1. Provide the encryption key (once). Reuse your existing .env, or generate one:
echo "GALAXY_ENCRYPTION_KEY=$(openssl rand -base64 32)" > .env

# 2. Build and start.
docker compose up -d --build
# → https://localhost:3000  (create the admin account on first visit)
```

- **Persistence.** `docker-compose.yml` bind-mounts `./data`, so the encrypted database, the TLS
  certificate (`data/tls/`), user accounts, and configured instances live on the host and survive
  rebuilds. An existing `./data/galaxy.db` is reused as-is (keep the matching key in `.env`).
- **The key never enters the image.** `.dockerignore` excludes `.env` and `data`; the key is passed
  at runtime via `env_file`, and the database and cert are on the mounted volume.
- **Logs / status:** `docker compose logs -f` · `docker compose ps` (a healthcheck hits the HTTPS
  endpoint, ignoring the self-signed cert).
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
5. The eight totals populate the four severity buckets, keeping the New vs In Progress split so
   each tile's severity bar is segmented by status.

## Sensor & connector status

Below the case counts each tile shows two REST-driven health blocks (green = healthy, red = trouble):

**Sensor status** (`GET /connect/api/v1/data_sensors`) — Connected vs Disconnected counts up top, and
the sensor **feature** mix (WDS / DS / Modular) below; a "need upgrade" chip appears when any sensor
is behind.

**Connector status** (`GET /connect/api/v1/connectors`, `is_collect: true` only) — the number of
collecting connectors, how many distinct **categories** they span, how many are **active**, and how
many are **healthy** (`status.code === 0`) versus **issues** (non-zero). Verified against a live
instance: 19 collecting connectors across 10 categories, 14 active, 2 healthy / 17 issues.

Both authenticate like the MCP server: the app trades the instance's API key for an access token at
`POST /connect/api/v1/access_token`, caches it until just before expiry, and uses it as the bearer
([access-token.ts](src/lib/rest/access-token.ts), [sensors.ts](src/lib/rest/sensors.ts),
[connectors.ts](src/lib/rest/connectors.ts)). Both reflect current state, so they ignore the
time-frame picker and refresh on the same 60-second cycle as the case counts.

## Time frame## Time frame

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

Tiles refresh every 60 seconds, and on demand from the header Refresh button.

## Testing a connection

Each tile's **gear icon** (admins only) opens an editable configuration window — server (console URL), MCP
endpoint, credentials, tenant, build hash, and tool overrides are all editable in place. A **Test
connection** button there runs the real sequence against the values on screen (before saving) and
reports each step separately, so a failure says which part broke:

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

## Security & access

- **HTTPS everywhere.** A custom Node server ([server.mjs](server.mjs)) serves the app over TLS. On
  first run it generates a self-signed certificate into `data/tls/` (SANs for `localhost` and
  `127.0.0.1`). Admins can regenerate it or install a CA-issued cert+key in **Global settings → TLS
  certificate**; a valid cert is applied to new connections immediately (`setSecureContext`), no
  restart — reload the page to reconnect. Uploaded certs are validated (PEM parses, and the key
  matches the cert) before they are accepted.
- **Login required.** Every page and API route requires a session. The first visit runs a one-time
  **create administrator** flow ([/setup](src/app/setup/page.tsx)); afterwards everyone signs in at
  [/login](src/app/login/page.tsx). Sessions are opaque random tokens stored **hashed** in the
  database and carried in an HttpOnly, Secure, SameSite=Lax cookie; the default lifetime is 12 hours.
- **Two roles.** *Administrator* has full rights (add/edit/remove instances, manage users, TLS).
  *User* is **read-only** — tiles, case counts, sensor status, and the console links, but no gear, no
  Add instance, no settings. Roles are enforced on the server (read routes require any user; every
  write and all settings require admin), not just hidden in the UI.
- **Password storage.** User passwords are stored only as salted **scrypt** hashes
  ([password.ts](src/lib/auth/password.ts)) — never in plaintext or reversibly. The last
  administrator cannot be demoted or deleted.
- **Console links.** A tile's **Cases** and **Sensors** links open the instance's console directly;
  you authenticate to the console yourself there. The app no longer stores console passwords or
  maintains a console session.

## Credential storage

- SQLite at `data/galaxy.db` (override with `GALAXY_DB_PATH`) — persistent across restarts.
- Each instance stores only its **API key**, sealed with **AES-256-GCM** before it is written. The
  envelope is `v1.<iv>.<tag>.<ciphertext>` with authenticated additional data, so a tampered row
  fails to decrypt rather than decrypting to garbage. (Per-instance usernames/passwords were removed
  along with the console-session feature.)
- The master key lives only in `GALAXY_ENCRYPTION_KEY` (`.env`, gitignored). Lose it and the stored
  API keys are unrecoverable; rotate it by re-entering the keys.
- **No secret is ever sent to the browser.** `/api/instances` returns a `hasApiKey` boolean;
  decryption happens only on the server, immediately before an outbound MCP/REST request.
- Leaving the API-key field blank when editing keeps the value already on disk.
- **User passwords** are stored separately as salted scrypt hashes (never encrypted/reversible), and
  session tokens are stored hashed — see **Security & access** above.

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
| `GALAXY_TLS_DIR` | `./data/tls` | Where the TLS cert/key are stored |
| `GALAXY_SESSION_TTL_MS` | `43200000` | Login session lifetime (default 12h) |
| `PORT` / `HOSTNAME` | `3000` / `0.0.0.0` | HTTPS listen address |
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
- The app is served by a custom HTTPS server ([server.mjs](server.mjs)); `npm run dev` and
  `npm start` both run it (dev has hot reload). There is no plain-HTTP listener.
- The app has its own login and role-based access, and serves HTTPS directly, so it can be exposed
  without a separate auth proxy. Still limit network exposure to trusted operators.
