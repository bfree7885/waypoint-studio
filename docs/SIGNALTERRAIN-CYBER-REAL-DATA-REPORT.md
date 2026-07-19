# SignalTerrain Cyber — Real Data Report

**Date:** 2026-07-18  
**Status:** Real-data system partially operational  
**Commit status:** Not committed. Not pushed. Owner review required.

---

## 1. Production status

**Real-data system partially operational**

The production cyber entry (`live.html`, default `index.html` redirect) displays only records from `data/cyber/live.json` produced by the live engine against official public sources. Sample intelligence is isolated to `teaching.html` and explicit `?teaching=1` workspace seeding. Secondary surfaces (brief scenarios, sample-backed explorer/advisor/knowledge) still exist but are labeled educational and linked away from live.

---

## 2. Live providers

| Provider | Status |
|----------|--------|
| CISA KEV | **Working** |
| NIST NVD (API 2.0, capped page) | **Working** (optional `NVD_API_KEY`) |
| CISA Cybersecurity Advisories (Atom/XML) | **Working** |
| Google Chrome Releases (Atom) | **Working** |
| Ubuntu Security Notices (RSS) | **Working** |
| Mozilla MFSA | **Planned** (feed URL 404 — not faked) |
| Microsoft MSRC | **Planned** |
| Apple / Cisco / EPSS | **Planned** |

Latest local run: **Live** trust state, **263** normalized records (200 KEV + 40 NVD + advisories/releases after dedupe).

---

## 3. Sample-data removal / isolation

| Action | Detail |
|--------|--------|
| Production hub | `cyber/index.html` → `live.html` |
| Teaching isolation | `teaching.html` with explicit banner + `noindex` |
| Live runtime ban list | Refuses sample/fixture URLs |
| Workspace seeds | Not loaded unless `?teaching=1` |
| Live graph | `data/cyber/graph.json` derived from live records |
| Fixtures retained | Under `**/samples/**` and ingest raw for tests only |
| Brief | Banner: educational demos; points to live |

---

## 4. Real records retrieved (example run)

| Type | Count |
|------|-------|
| exploited-vulnerability (KEV) | 200 |
| vulnerability (NVD) | 40 |
| security-advisory | ~22 |
| software-security-release | ~20 (Chrome; varies) |
| **Unified after dedupe** | **~263** |

---

## 5. Technology profile

Local inventory (`st_inventory_v1`) editable on `#profile`. Matching levels: exact / vendor / platform / ambiguous / none. Client re-score adjusts profile weight only. Careful language — no silent “you are vulnerable.”

---

## 6. Priority engine

Deterministic 0–100 with Immediate/High/Monitor/Informational bands. Factors documented in [SIGNALTERRAIN-CYBER-PRIORITY-MODEL.md](SIGNALTERRAIN-CYBER-PRIORITY-MODEL.md). Each record ships `priority.contributions` + explanation.

---

## 7. Provider resilience

Trust states: Live / Partial / Cached / Error. Failures surface in `#providers`. No sample substitution. Last-known-good live artifact retained when refresh yields zero success and prior file exists.

---

## 8. Security review

| Issue | Resolution |
|-------|------------|
| API keys in frontend | Not used; NVD key server-side env only |
| HTML from feeds | Stripped / escaped; no raw HTML render |
| SSRF | Allowlisted endpoints in engine |
| Profile privacy | localStorage only |
| Sample as silent fallback | Banned in live runtime |

---

## 9. Validation

```bash
node scripts/signalterrain-cyber-live-engine.mjs
node automation/test-signalterrain-cyber-live.mjs
```

Live contract tests cover isolation, KEV presence, scoring, profile match. Full production Pages “build” remains static artifact publish (no bundler). Lint/typecheck N/A for this IIFE stack.

---

## 10. Files created or modified (high level)

**Created:** live engine, live JS/HTML, teaching.html, `data/cyber/*`, automation cyber env example + live tests, docs (audit, sources, priority, profile, operations, this report).

**Modified:** cyber `index.html` redirect, nav config, inventory vendor fields, workspace seed gating, brief banner, living roadmap pointers (if updated).

---

## 11. Remaining limitations

- Brief / advisor / explorer / knowledge still primarily teaching-oriented unless wired fully to live graph  
- Not all vendor advisories integrated (MSRC, Apple, Cisco, Mozilla planned)  
- NVD pull is a capped recent page — not full corpus sync  
- No EPSS yet  
- No server-side scheduled refresh in GitHub Actions yet (manual/cron like outdoor engine)  
- Chrome feed mixes security and non-security posts  
- Profile matching without versions remains ambiguous  
- `data/cyber/live.json` ~1MB must be published with the site for Pages users  

---

## 12. Commit status

**Not committed. Not pushed. Owner review required.**
