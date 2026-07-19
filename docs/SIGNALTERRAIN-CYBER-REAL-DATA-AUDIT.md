# SignalTerrain Cyber — Real Data Audit

**Date:** 2026-07-18  
**Status:** In progress — production path must not display sample intelligence  
**Owner review:** Required before commit

---

## Summary

| Category | Count (approx) | Production impact |
|----------|----------------|-------------------|
| Sample / seed JSON packages | 15+ files | High — all cyber HTML mounts loaded them |
| Mock connectors | 9 | High if presented as live |
| Brief scenario samples | 5 | High if default “today” |
| Workspace / research seeds | 2 | Medium — seeds local research |
| Advisor inventory samples | 2 | Medium — opt-in load |
| Contract-test fixtures | Same fixtures | OK if test-only |

**Policy going forward:** Production mounts (`live.html`, default cyber hub) read only `data/cyber/live.json` produced by the live engine. Sample packages remain under `intelligence/cyber/**/samples/` and `ingestion/samples/` for **teaching mode and tests only**.

---

## Inventory

| File | Component | Purpose | In production? | Action | Replacement | Status |
|------|-----------|---------|----------------|--------|-------------|--------|
| `intelligence/cyber/samples/cyber-intelligence.sample.json` | Graph sample | Teaching cases | Was yes (all mounts) | Isolate to teaching | Live bundle | Done |
| `intelligence/cyber/samples/research-workspace.sample.json` | Research seed | Demo bookmarks | Was yes | Isolate | Empty local research | Done |
| `workspace/samples/workspace.seed.json` | Workspace seed | Demo investigations | Was yes | Isolate | Empty until user creates | Done |
| `briefing/samples/*.brief.json` | Brief demos | Scenario theatre | Was optional | Isolate | Live brief from records | Done |
| `advisor/samples/inventory.*.json` | Inventory demos | Sample profiles | Opt-in | Keep test/teaching only | User local inventory | Done |
| `ingestion/samples/raw/*.json` | Mock connector payloads | Ingest health demos | Internal page | Keep test-only | Live providers | Done |
| `ingestion/connectors.json` | Mock catalog | `status: mock` | Internal | Keep labeled mock | Live provider registry | Done |
| `wds-signalterrain-cyber-connectors.js` | Mock fetch | Fixture normalizers | Internal | Retain for tests | Live engine Node adapters | Done |
| `wds-signalterrain-cyber.js` mount | Awareness hub | Loaded sample graph | Was yes | Point hub to live | Live dashboard | Done |
| `apps/.../ingest-health.html` | Diagnostics | Mock pipeline UI | Linked in nav | Relabel internal/mock | Live provider health panel | Done |
| Contract tests `automation/test-signalterrain-cyber-*.mjs` | Fixtures | Smoke tests | No UI | Retain | Add live isolation tests | Done |
| Docs mentioning sample Log4Shell etc. | Docs | Education | N/A | Retain with clear labels | — | OK |

---

## Production isolation rules

1. `WDS.signalTerrainCyberLive` must not `fetch` any `*.sample.json` or `workspace.seed.json`.  
2. Empty live artifact → honest empty state, never sample.  
3. Teaching surfaces require explicit `teaching.html` or `?mode=teaching`.  
4. Tests may import fixtures; production modules must not.

---

## Completion notes

See [SIGNALTERRAIN-CYBER-REAL-DATA-REPORT.md](SIGNALTERRAIN-CYBER-REAL-DATA-REPORT.md) for post-implementation status.
