# Sheds + SignalTerrain production readiness — owner review

**Branch:** `release/sheds-signalterrain-readiness`  
**Base:** `main` @ `f942c7b` (+ readiness integration + cherry-pick `506fb85` Today’s Search)  
**Date:** 2026-08-07  
**Author:** readiness prep (do **not** merge without explicit owner authorization)  
**Runtime:** local static server `http://127.0.0.1:8765` + headless Chrome CDP screenshots

---

## Executive verdicts

| Product | Verdict | One-line |
|---|---|---|
| **Sheds** | **Ready for production release** (flagship outdoor) | Map-first whitetail field intelligence with Today’s Search; primary nav + `/sheds/` open the useful map experience. |
| **SignalTerrain** | **Conditional — discoverable, not fully fresh** | Live cyber dashboard is the direct entry under Side Trails; retain **Experimental**. Blocker: live artifact on this tip is stale (`generatedAt` **2026-07-19**); refresh WIP exists uncommitted on `feature/signalterrain-live-cyber-intelligence`. |

**Do not merge this branch automatically.** Push for owner review only.

---

## Recommended release order

1. **Sheds** (Today’s Search + observation-only heatmaps) — outdoor flagship, already productized.
2. **Homepage Side Trails teaser + ST entry redirects** (this prep branch’s link/label fixes) — makes ST discoverable without elevating it above outdoor identity.
3. **SignalTerrain live refresh** — land the in-progress live-engine refresh + scheduled workflow from the ST worktree **after** it is committed/reviewed; then consider promoting freshness claims.
4. **Adaptive Defense** — only after live refresh is stable; keep Experimental.

Optional upstream: if `release/side-trails-discovery` is preferred as the carrier for homepage/nav/GS, rebase or merge this prep onto that tip before production Pages deploy — **still requires explicit merge authorization**.

---

## What this prep branch changes

### Sheds
- Cherry-picked `feat(sheds): Today's Search briefing and observation-only heatmaps` (`506fb85`).
- Homepage Sheds deepeners copy → **whitetail field intelligence**; CTA still opens the field map.
- Primary nav hint → “Whitetail field intelligence”; product route prefers map.
- `/sheds/` already redirects to `apps/shed-hunting/map/` (unchanged pattern).

### SignalTerrain (under Side Trails only)
- Homepage Side Trails teaser (from `feature/homepage-side-trails-section`) with ST card → **`apps/signalterrain/cyber/live.html`**.
- `apps/signalterrain/index.html` → redirect to live cyber (no catalog maze).
- Side Trails catalog CTA → “Open live intelligence” → live dashboard.
- Product landing primary CTA → live intelligence (mockup demoted).
- Nav/registry start routes → live cyber; sample routes labeled **(samples)**.
- Status remains **Experimental** (maturity warrants it).

### Not redesigned
- Waypoint Studio Home outdoor identity, primary nav set, and Sheds field map chrome were not redesigned — only entry, copy, labels, and integration.

---

## Owner review coverage

| Surface | Desktop | Mobile | Notes |
|---|---|---|---|
| Homepage | Yes | Yes | Outdoor first; Sheds in primary nav; Side Trails quieter below |
| Homepage Sheds section | Yes | — | Whitetail field intelligence copy |
| Homepage Side Trails | Yes | Yes | ST Experimental; opens live cyber |
| Navigation | Yes | Yes | Sheds primary; ST not a primary peer |
| Sheds map / Today’s Search | Yes | Yes | Honest limited briefing when location/weather unavailable |
| Side Trails catalog | Yes | Yes | ST card → live |
| ST product landing | Yes | — | Live CTA primary |
| ST live cyber | Yes | Yes | LIVE trust strip; no sample fallback |
| Live-data failure / freshness | Yes | — | Honest unavailable providers; **artifact date is stale on this tip** |
| Sample/demo leakage | Yes | — | Teaching samples isolated; live bans sample paths |

---

## Screenshots

Paths relative to repo root:

| File | What it shows |
|---|---|
| `docs/releases/sheds-signalterrain-readiness/screenshots/home-desktop.png` | Home outdoor instruments + primary nav including Sheds + Side Trails |
| `docs/releases/sheds-signalterrain-readiness/screenshots/home-mobile.png` | Mobile home / Side Trails scroll |
| `docs/releases/sheds-signalterrain-readiness/screenshots/home-sheds-desktop.png` | Homepage Sheds → whitetail field intelligence |
| `docs/releases/sheds-signalterrain-readiness/screenshots/home-side-trails-desktop.png` | Side Trails teaser with SignalTerrain Experimental |
| `docs/releases/sheds-signalterrain-readiness/screenshots/sheds-map-desktop.png` | Sheds map with **Today’s Search** (honest limited state) |
| `docs/releases/sheds-signalterrain-readiness/screenshots/sheds-map-mobile.png` | Sheds map mobile |
| `docs/releases/sheds-signalterrain-readiness/screenshots/todays-search-collapsed.png` | Feature-branch Today’s Search UI (collapsed) |
| `docs/releases/sheds-signalterrain-readiness/screenshots/todays-search-expanded.png` | Today’s Search expanded |
| `docs/releases/sheds-signalterrain-readiness/screenshots/todays-search-mobile.png` | Today’s Search mobile |
| `docs/releases/sheds-signalterrain-readiness/screenshots/observed-activity-filters.png` | Observation-only heatmap filters |
| `docs/releases/sheds-signalterrain-readiness/screenshots/side-trails-desktop.png` | Side Trails catalog |
| `docs/releases/sheds-signalterrain-readiness/screenshots/side-trails-mobile.png` | Side Trails mobile |
| `docs/releases/sheds-signalterrain-readiness/screenshots/st-landing-desktop.png` | ST product story → Open live intelligence |
| `docs/releases/sheds-signalterrain-readiness/screenshots/st-live-desktop.png` | Live cyber dashboard |
| `docs/releases/sheds-signalterrain-readiness/screenshots/st-live-mobile.png` | Live cyber mobile |
| `docs/releases/sheds-signalterrain-readiness/screenshots/st-app-redirect.png` | `/apps/signalterrain/` lands on live |

Capture helper: `automation/capture-sheds-st-readiness-screenshots.mjs`

---

## Branch / tip audit (parallel work)

| Branch / tip | State at review time | Action taken |
|---|---|---|
| `feature/sheds-todays-search` @ `506fb85` | **Shipped** Today’s Search + observation heatmaps | Cherry-picked onto prep |
| `feature/signalterrain-live-cyber-intelligence` | Tip empty vs main; **uncommitted** live refresh + Adaptive Defense in worktree (`waypoint-studio-st-live-cyber`) with fresh `generatedAt` ~2026-08-08 | **Not merged** — document as blocker; do not steal unfinished agent work |
| `feature/homepage-side-trails-section` @ `5a46285` | Homepage Side Trails teaser | Integrated (with ST → live href) |
| `feature/side-trails-primary-nav` @ `740c068` | Absolute-path nav polish | Partially covered by main/discovery; not fully re-applied (acceptance met via existing Side Trails primary item) |
| `release/side-trails-discovery` | Ahead of main with homepage/nav/GS | Not auto-merged; recommended as optional carrier |

---

## Remaining blockers

1. **SignalTerrain live freshness on this tip** — `data/cyber/live.json` `meta.generatedAt` = **2026-07-19T01:47:57Z** while UI shows LIVE. Honest for “last successful run,” but not “current as of today.” Refresh engine + commit from ST worktree before claiming current production cyber.
2. **`feature/signalterrain-live-cyber-intelligence` unfinished** — large uncommitted diffs (live.json, signal engine, CSS/JS) + Adaptive Defense scripts/screenshots/workflow. Needs agent finish + review before release order step 3–4.
3. **ST local nav maze** — live dashboard chrome still exposes many secondary routes (topics/graph/summary samples). Acceptable for Experimental; tighten local nav in a follow-up if it still feels maze-like after redirect.
4. **Pre-existing `test-platform-experience-rc2.mjs` failures on main** (home pillars / startHereHref) — not introduced by this prep; do not treat as Sheds/ST gate.
5. **Do not merge / do not deploy** until owner explicitly authorizes.

---

## Tests run (prep worktree)

- `automation/test-home-rc1.mjs` — pass
- `automation/test-side-trails.mjs` — pass
- `automation/test-signalterrain-landing.mjs` — pass
- `automation/test-signalterrain-side-trails-move.mjs` — pass
- `automation/test-signalterrain-sprint5.mjs` — pass
- `automation/test-signalterrain-cyber-live.mjs` — pass
- `automation/test-sheds-todays-search.mjs` — pass
- `automation/test-sheds-observation-heat.mjs` — pass

---

## Production-readiness detail

### Sheds — **GO**
- Discoverable as core outdoor app (primary nav).
- Opens directly into map + Today’s Search (not placeholder).
- Homepage communicates whitetail field intelligence.
- Privacy-first observations; ethics gate; no fabricated sightings.
- Observation heatmaps are observation-only (no demo seeds).

### SignalTerrain — **CONDITIONAL GO for discovery; HOLD on “current” claim**
- Remains under Side Trails; not a Home primary peer.
- Visible from homepage Side Trails section.
- Opens directly into live cyber dashboard.
- Homepage copy: current defensive cyber intelligence.
- Experimental label retained.
- Sample paths banned in live runtime; teaching isolated.
- **Hold:** refresh live artifact / land ST live-cyber WIP before marketing “current.”
