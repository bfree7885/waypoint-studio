# SignalTerrain Cyber — Performance Benchmarks (Phase 2)

**Run date:** 2026-07-19 (UTC)  
**Machine:** local developer host  
**Command:** `node scripts/signalterrain-cyber-live-engine.mjs`

---

## Artifact run (representative)

| Metric | Result |
|--------|--------|
| Trust state | Live |
| Providers OK | 12 |
| Providers planned (honest empty) | 6 |
| Records after dedupe | 294 |
| Surfaced by default | 220 |
| Hidden (noise) | 74 |
| Correlation entities | 394 |
| Correlation relationships | 958 |
| Signal engine processing | **~56 ms** |
| End-to-end wall time (warm DNS / providers) | **~1–3 s** typical; cold can be higher |

---

## UI

| Metric | Notes |
|--------|-------|
| Session cache | `st_cyber_live_cache_v3`, 5 min TTL |
| First paint | Hash SPA; brief paints without waiting on history |
| Payload | `live.json` still large (~MB) — primary remaining cost |

---

## Interpretation

The intelligence layer is **CPU-cheap**. Product latency is dominated by:

1. Provider network fetches  
2. JSON parse / transfer of the full live artifact  
3. Client re-score against local inventory  

---

## Next benchmark targets (V1.0)

- Split indexes: `brief.json` + `records-index.json` + lazy detail  
- Provider parallelization with hard budgets  
- Compression / CDN cache headers for static hosting  
