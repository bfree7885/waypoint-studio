# SignalTerrain Cyber — Operations

**Engine:** `scripts/signalterrain-cyber-live-engine.mjs`  
**Outputs:** `data/cyber/live.json`, `data/cyber/health.json`, `data/cyber/dashboard.json`  
**UI:** `side-trails/signalterrain/dashboard/` (first real dashboard), `apps/signalterrain/cyber/live.html` (deeper feeds)

---

## Refresh workflow

1. Configure optional `NVD_API_KEY` (see `automation/cyber/.env.example`).  
2. Run: `node scripts/signalterrain-cyber-live-engine.mjs`  
3. Confirm `data/cyber/health.json` providers and `trustState` / `dataState`.  
4. Open `side-trails/signalterrain/dashboard/` (static host must serve `/data/cyber/dashboard.json`).  

**Scheduled:** GitHub Actions `.github/workflows/signalterrain-cyber-refresh.yml` — cron `15 */6 * * *` (every 6 hours) + `workflow_dispatch`.

Suggested local cadence: every 15–60 minutes for KEV/advisory class; NVD page pull on the same schedule is acceptable at capped page size. Do **not** download the entire NVD corpus on each run. KEV→NVD enrichment is capped (`CYBER_MAX_NVD_ENRICH`, default 25) with rate-limit delays.

---

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NVD_API_KEY` | empty | Higher NVD rate limits (optional; unauthenticated path remains useful) |
| `CYBER_REFRESH_ENABLED` | true | Set false to skip |
| `CYBER_PROVIDER_TIMEOUT_MS` | 15000 | Per-request timeout |
| `CYBER_MAX_KEV` | 200 | Newest KEV rows retained |
| `CYBER_MAX_NVD` | 40 | NVD page size |
| `CYBER_MAX_NVD_ENRICH` | 25 | KEV CVEs enriched via NVD CVE API |
| `CYBER_DEBUG` | false | Verbose logs |
| `CYBER_LIVE_OUT` / `CYBER_HEALTH_OUT` / `CYBER_DASHBOARD_OUT` | `data/cyber/*` | Override paths |

---

## Honesty labels

Every provider and dashboard panel uses: **REAL** · **CACHED REAL** · **SOURCE UNAVAILABLE** · **NO CURRENT DATA**.  
On total fetch failure the engine retains last-known-good `live.json` and marks it cached/stale — it does not wipe or invent substitutes.

---

## Provider health

Visible in dashboard Source Health and `health.json`. Statuses: `ok`, `error`, `cached`, `planned`.

---

## Troubleshooting

| Symptom | Action |
|---------|--------|
| Empty dashboard | Run engine; ensure `data/cyber/dashboard.json` is deployed with the site |
| Partial trust | Inspect failed providers; do not invent replacements |
| NVD 403/429 | Add API key; back off |
| Stale labels | Check `generatedAt` vs wall clock |

## Safe rollback

Keep prior `live.json` under version control or backup. On total fetch failure the engine retains last-known-good when possible.

## Data retention

Live artifact grows with caps above. No unbounded append log in v1. Profile data stays in browser storage until cleared.
