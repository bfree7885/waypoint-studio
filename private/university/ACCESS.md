# Waypoint University — Exact Access Instructions (Module 5)

**Status:** Local private application — ready for owner daily use  
**Remote `university.waypointstudio.org`:** **Not available yet** (static GitHub Pages stack has no auth server; `private/` is stripped from public deploy)

---

## 1. Exact access method (copy/paste)

```bash
cd /home/bryan/projects/waypoint-scenes/private/university
./start.sh setup          # first time only — creates server/.env (gitignored)
./start.sh                # starts owner server on loopback
```

Then open:

```text
http://127.0.0.1:8787/
```

Sign in with the **owner email and password** you set during `setup`.

Stop the server with `Ctrl+C`.

### One-liner after setup

```bash
cd /home/bryan/projects/waypoint-scenes/private/university && ./start.sh
```

URL: **http://127.0.0.1:8787/**

---

## 2. Where the application lives

| Piece | Path |
|-------|------|
| App UI | `private/university/` |
| Owner server | `private/university/server/server.mjs` |
| Secrets | `private/university/server/.env` (**gitignored**) |
| Knowledge data | Browser **IndexedDB** `waypoint-university-v1` (this user profile) |

---

## 3. Authentication

- **Model:** Single owner account (email allowlist of one + password)
- **No public registration**, invitations, or teams
- **Mechanism:** Node `crypto.scrypt` password verify + HMAC-signed **HttpOnly** `SameSite=Strict` session cookie
- **CSRF:** login form token
- **Rate limit:** login attempts capped per IP
- **Default bind:** `127.0.0.1` only (not exposed on LAN unless you change `WU_BIND`)

### Owner account creation

```bash
./start.sh setup
```

Prompts for email + password (min 12 characters). Writes `server/.env` mode `0600`.

### Required environment variables

| Variable | Purpose |
|----------|---------|
| `WU_BIND` | Listen address (default `127.0.0.1`) |
| `WU_PORT` | Port (default `8787`) |
| `WU_OWNER_EMAIL` | Sole allowed email |
| `WU_PASSWORD_SALT` | scrypt salt (hex) |
| `WU_PASSWORD_HASH` | scrypt hash (hex) |
| `WU_SESSION_SECRET` | Cookie HMAC secret |
| `WU_SECURE_COOKIES` | `1` only behind HTTPS |

Template: `server/.env.example` (no secrets).

### Sign out

Settings → **Sign out**, or open `http://127.0.0.1:8787/logout`

### Recover access if authentication fails

1. Delete or rename `private/university/server/.env`
2. Run `./start.sh setup` again
3. Knowledge in IndexedDB is **unchanged** (auth is separate from data)

If you forget the password but still have a JSON export, you can re-setup auth and re-import.

---

## 4. Daily use (short)

1. Start server → open URL → sign in  
2. Home → Quick capture → create “Spatial Computing” (or any note)  
3. Edit → set Learning path, Projects, tags, Markdown body → Save  
4. Add Connections (question, source, path via `part-of`)  
5. Search for the title  
6. Open Projects hub / Learning path to find it again  
7. Settings → Export JSON backup  
8. Sign out  

---

## 5. Data & backup

| Fact | Detail |
|------|--------|
| Storage | IndexedDB on the browser profile that signed in |
| Survives restart? | **Yes** (same browser profile) |
| Real backup? | Only if you **Export JSON** (or Markdown) — downloads to disk |
| Restore | Settings → Import JSON |
| Media blobs | Not included yet |

**Do not assume data is backed up** until you have an export file.

---

## 6. Deployment status

| Mode | Status |
|------|--------|
| Local only (loopback) | **Supported now** |
| Local network | Possible by changing `WU_BIND` — **not recommended** without firewall/TLS |
| Deployed privately on `university.waypointstudio.org` | **Blocked** — needs DNS + reverse proxy + TLS + host that is **not** public GitHub Pages |
| Public internet safe? | **No** — loopback auth is for single-machine owner use |

### Remaining before secure remote deployment

1. DNS for `university.waypointstudio.org`  
2. Separate host (not Pages) or tunnel (Tailscale / Cloudflare Access)  
3. TLS termination  
4. `WU_SECURE_COOKIES=1`  
5. Prefer still keeping knowledge local-first or add encrypted sync (future)

---

## 7. Security summary

**Done:** owner-only login, HttpOnly cookie, CSRF on login, rate limit, noindex, Pages strip of `private/`, robots disallow, no shared default password, secrets gitignored, safe errors on login.

**Risks remaining:** knowledge still lives in browser IDB (device theft / shared browser profile); loopback mis-bind; no 2FA; static app code is in the private git repo for anyone with repo access.

---

## 8. Tests

```bash
cd /home/bryan/projects/waypoint-scenes
node private/university/tests/module5-smoke.mjs
```
