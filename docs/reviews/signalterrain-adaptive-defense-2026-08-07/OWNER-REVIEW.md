# Owner review — SignalTerrain Live Cyber + Adaptive Defense

**Branch:** `feature/signalterrain-live-cyber-intelligence`  
**Worktree:** `/home/bryan/Projects/waypoint-studio-st-live-cyber`  
**Status:** Ready for owner review — **do not merge** until approved  
**Author:** Bryan Freeman  

---

## Verdict

Adaptive Defense is wired to **live ingested** cyber intelligence (not samples). The live dashboard answers “What should I care about differently today?” with transparent categories, evidence, and an explicit **devices-not-inspected** disclaimer.

---

## Live sources (this refresh)

| Provider | Status | Notes |
|----------|--------|-------|
| CISA KEV | ok | 200 newest catalog rows |
| NIST NVD | ok | capped recent page (40) |
| CISA Advisories (Atom) | ok | 20 |
| Chrome Releases | ok | 20 |
| Ubuntu USN | ok | 10 |
| GitHub Advisories (GHSA) | ok | 25 |
| AWS / Cloudflare / GitHub / OpenAI / GCP / Azure status | ok | public status |
| Mozilla MFSA / MSRC / Apple / Cisco / EPSS / M365 status | planned | not faked as live |

**Trust state:** Live  
**Generated at:** `2026-08-08T02:16:38.501Z`  
**Records:** 292 (220 surfaced / 72 low-signal hidden)  
**Provider failures this run:** none (`providersError: 0`)  
**CISA 403 note:** Some environments block CISA; engine retains last-known-good and surfaces honest failures. Documented in `docs/SIGNALTERRAIN-CYBER-OPERATIONS.md`.

---

## Refresh cadence

`.github/workflows/signalterrain-cyber-refresh.yml` — **every 6 hours** (`cron: 15 */6 * * *`) + `workflow_dispatch`.  
Commits only `data/cyber/*` when non-empty, sample-free, and changed.

---

## How Adaptive Defense priorities are computed

Module: `scripts/cyber-signal/adaptive-defense.mjs` (also maps `recommendAction` → `defenseCategory`).

**Inputs (live only):** known exploitation / CISA KEV · severity · ransomware flags · vendor advisories · recency · evidence quality · prevalence hints from named vendors/products · optional browser-local inventory (never leaves the browser).

**Categories:** `PATCH / UPDATE` · `MITIGATE` · `REVIEW` · `WATCH` · `NO IMMEDIATE ACTION`

Each item includes: Why this moved up · Evidence (source URLs) · Affected products · Confidence · Last updated · general defensive steps.

**Hard rule:** SignalTerrain has **not** inspected user devices/networks/accounts. Production never substitutes sample threats.

---

## Live examples (headline)

| Category | Item | Why (excerpt) |
|----------|------|----------------|
| PATCH / UPDATE | Check Point Security Gateway … | Official known-exploited (CISA KEV) + ransomware association |
| PATCH / UPDATE | Palo Alto Networks PAN-OS … | Priority rose 89→100; KEV + ransomware flag |
| PATCH / UPDATE | Microsoft Exchange Server … | Official known-exploited (CISA KEV) |
| REVIEW | GHSA crypto-js / CodeIgniter … | Newly surfaced in this live refresh |

---

## Deliverables

1. Ingestion + adapters + normalized live artifact (`scripts/signalterrain-cyber-live-engine.mjs`)  
2. Dashboard UI + **Adaptive Defense** panel (`live.html` / `wds-signalterrain-cyber-live.js`)  
3. GH Actions refresh workflow  
4. Tests: `automation/test-signalterrain-cyber-live.mjs`, `automation/test-signalterrain-adaptive-defense.mjs` (fixture unit + live contract)  
5. Screenshots (below)  
6. This owner-review doc  

### Screenshots

- `docs/reviews/signalterrain-adaptive-defense-2026-08-07/screenshots/01-overview-brief.png`  
- `docs/reviews/signalterrain-adaptive-defense-2026-08-07/screenshots/02-adaptive-defense.png`  
- `docs/reviews/signalterrain-adaptive-defense-2026-08-07/screenshots/03-feeds-health.png`  

---

## Tests run

```bash
node scripts/signalterrain-cyber-live-engine.mjs
node automation/test-signalterrain-cyber-live.mjs
node automation/test-signalterrain-adaptive-defense.mjs
```

All passed on this branch.

---

## Risks / follow-ups

- Planned providers (MSRC, Apple, Mozilla MFSA, EPSS) still pending real endpoints.  
- KEV rows currently assume patch availability from catalog `requiredAction` — MITIGATE band may be underused until patch signals are more precise.  
- Educational `advisor.html` still loads sample graph for teaching; production path is `live.html#adaptive`.  
- Large `live.json` (~2MB) is git-tracked for Pages — acceptable for cadence, watch repo size.

---

## Recommendation

**Approve for merge after owner skim of Adaptive Defense UI + trust strip.** Do not merge until you confirm: disclaimers, category language, and 6h refresh cadence. Optional: add `NVD_API_KEY` repo secret before relying on Actions NVD pulls under load.
