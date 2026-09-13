# Production Summit

Phase 7.9L. Summit is a Cedar Hollow product feature. GitHub Pages stays static. A small Cloudflare Worker holds the Groq key.

## Production baseline (first live Summit)

Accepted 2026-09-13. Future TerrainBound work starts here.

| Item | Value |
| --- | --- |
| Source SHA | `db2b7cc04bcbcd548657b5daa5addd42520c0eff` |
| Companion Pages SHA | `1618cd695e0b6b8b6473867671678c0895eb4ca1` (`bfree7885/terrainbound-site`) |
| Live site | `https://terrainbound.org` (GitHub Pages; cache-bust `?v=p79l`) |
| Summit Worker | `https://terrainbound-summit.bfree7885.workers.dev` |
| Tag | `terrainbound-summit-production-2026-09` |
| `summit.terrainbound.org` | Deferred — not required |

Do not move Pages DNS. Do not change the Worker for housekeeping. Do not treat the custom hostname as a release blocker.

## Architecture

```
https://terrainbound.org   (GitHub Pages, bfree7885/terrainbound-site)
        ↓
TerrainBound client
        ↓ HTTPS POST /summit
https://terrainbound-summit.bfree7885.workers.dev   (Cloudflare Worker)
        ↓
Groq  openai/gpt-oss-20b
```

`summit.terrainbound.org` is a **deferred** DNS enhancement. It is not required for production Summit. Do not move `terrainbound.org` Pages DNS.

The browser never receives `SUMMIT_API_KEY`. If the Worker is unreachable, rate-limited, slow, or returns unusable JSON, the client uses the existing deterministic Summit fallback. Students do not see HTTP status, Groq, or JSON errors.

## Why Cloudflare Worker

GitHub Pages cannot run `terrainbound/server/summit-proxy.mjs`. This repo has no Vercel/Fly/Railway config. A Worker is:

- one POST route plus GET `/health`
- HTTPS by default
- environment secrets
- no database
- inexpensive at Cedar Hollow traffic
- leaves `terrainbound.org` on Pages

Local development still uses the loopback proxy:

```
http://127.0.0.1:8787/summit-ai
```

`?summit=ai` and `?summit=fieldtest` remain developer flags. Ordinary production play does not need a query parameter.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | `{ ok, configured }` — no secrets, no student data |
| POST | `/summit` | Hosted language layer |
| POST | `/summit-ai` | Same handler (local/compat) |

## CORS

Allow only:

- `https://terrainbound.org`
- `https://www.terrainbound.org`

Localhost is allowed only when `SUMMIT_ALLOW_LOCAL=1` (loopback proxy). Production Worker sets `SUMMIT_ALLOW_LOCAL=0`. No wildcard origin.

## Abuse control

- 8 KB max body
- question ≤ 240 characters, prompt ≤ 6 000, explanation ≤ 800
- 12 requests / minute and 4 / 10 seconds per hashed client IP (in-memory per Worker isolate; enough to stop a noisy browser tab without student accounts)
- at most one upstream retry, never on 429
- client `retry429: 0`

Limited or failed calls become deterministic Summit copy.

## Privacy

The Worker accepts only `prompt`, `question`, and a compact packet (facts, tutoring caps, last four turns). It drops names, email, school, coordinates, and extra keys. Ops logs record timestamp, status, latency, and result category — not student utterances and not API keys. No transcript database.

## Client modes

| Host / flag | Mode | Endpoint |
| --- | --- | --- |
| `terrainbound.org` | production | `https://terrainbound-summit.bfree7885.workers.dev/summit` |
| `?summit=ai` on localhost | local-ai | loopback proxy |
| `?summit=fieldtest` | fieldtest | loopback proxy + observer chrome |
| `?summit=local` | offline | LocalComposer only |
| localhost default | offline | LocalComposer; Summit UI still available |

## Cost (GPT-OSS 20B on Groq)

List prices from `data/summit/bakeoff.json` (2026-09-11): **$0.075 / M input tokens**, **$0.30 / M output tokens**.

Typical hosted science turn from 7.9H/K: ~500–800 input tokens, ~60–120 output tokens, one retry rare.

Estimated hosted turn: **< $0.0001**. Deterministic routes (game-help, next-action, inventory, progression, character, vocab) do not call Groq. A session that asks Summit ten times with two science follow-ups is on the order of **$0.0002**.

## Deploy Worker (owner)

Requires a Cloudflare account. This repository cannot create that account.

```bash
cd terrainbound/server
npx wrangler login
npx wrangler secret put SUMMIT_API_KEY
npx wrangler deploy
```

Worker URL after deploy:

```
https://terrainbound-summit.bfree7885.workers.dev
```

`summit.terrainbound.org` is deferred. Do not create a Cloudflare zone or change Pages apex DNS for it.

Do not put the key in `wrangler.toml`, Pages, or the companion site repo.

## Publish static site

Canonical source: `waypoint-scenes/terrainbound`.

```bash
git clone git@github.com:bfree7885/terrainbound-site.git
node terrainbound/scripts/publish-static.mjs /path/to/terrainbound-site
# review, commit, push main on terrainbound-site
```

The script copies `index.html`, `css/`, `js/`, `assets/`, and `data/` except `.env`. It does not copy `server/`, `tests/`, `scripts/`, or `docs/`.

## Health check

```
curl -sS https://terrainbound-summit.bfree7885.workers.dev/health
```

Expect `{ "ok": true, "configured": true }`.
