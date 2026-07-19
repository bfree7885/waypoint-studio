# SignalTerrain Cyber — Operations

**Engine:** `scripts/signalterrain-cyber-live-engine.mjs`  
**Outputs:** `data/cyber/live.json`, `data/cyber/health.json`  
**UI:** `apps/signalterrain/cyber/live.html`

---

## Refresh workflow

1. Configure optional `NVD_API_KEY` (see `automation/cyber/.env.example`).  
2. Run: `node scripts/signalterrain-cyber-live-engine.mjs`  
3. Confirm `data/cyber/health.json` providers and `trustState`.  
4. Open `live.html` (static host must serve `/data/cyber/live.json`).  

Suggested cadence: every 15–60 minutes for KEV/advisory class; NVD page pull on the same schedule is acceptable at capped page size. Do **not** download the entire NVD corpus on each run.

---

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NVD_API_KEY` | empty | Higher NVD rate limits |
| `CYBER_REFRESH_ENABLED` | true | Set false to skip |
| `CYBER_PROVIDER_TIMEOUT_MS` | 15000 | Per-request timeout |
| `CYBER_MAX_KEV` | 200 | Newest KEV rows retained |
| `CYBER_MAX_NVD` | 40 | NVD page size |
| `CYBER_DEBUG` | false | Verbose logs |
| `CYBER_LIVE_OUT` / `CYBER_HEALTH_OUT` | `data/cyber/*` | Override paths |

---

## Provider health

Visible in UI `#providers` and `health.json`. Statuses: `ok`, `error`, `cached`, `planned`.

---

## Troubleshooting

| Symptom | Action |
|---------|--------|
| Empty live UI | Run engine; ensure `data/cyber/live.json` is deployed with the site |
| Partial trust | Inspect failed providers; do not invent replacements |
| NVD 403/429 | Add API key; back off |
| Stale labels | Check `generatedAt` vs wall clock |

## Safe rollback

Keep prior `live.json` under version control or backup. On total fetch failure the engine retains last-known-good when possible.

## Data retention

Live artifact grows with caps above. No unbounded append log in v1. Profile data stays in browser storage until cleared.
