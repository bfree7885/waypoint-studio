# Dashboard RC3 Sprint 3 — Daily Brief & Waypoint's Take — Owner Review

**Status:** Awaiting owner review — **not merged · not deployed**  
**Date:** 2026-07-24  
**Sprint:** Dashboard RC3 Sprint 3 — Daily Brief & Waypoint's Take  
**Authority:** Product standards · Engineering playbook · Rebuild architecture · Sprint 2 owner review  
**Base:** `feature/dashboard-rc3-sprint2-refinement` @ `0034cf5` (Sprint 2 docs tip; feature `e155991`)  
**Branch:** `feature/dashboard-rc3-sprint3-daily-brief`  
**Final commit SHA:** `335bcf24161ac8de83fabbcb628a7d75227ac62d` (feature; see branch tip after push)  
**Deployment status:** **Not deployed**

---

## Executive summary

Today Outside now opens with a compact **Daily Brief** — Today's Outlook, Opportunity Highlights, Things to Watch, Why Today Is Interesting, and Waypoint's Take — composed from the same Outdoor Intelligence pack Sprint 2 calibrated. Morning open reads like a short porch conversation with a knowledgeable naturalist: insightful, calm, and grounded in present signals. No redesign, no second dashboard, no new APIs, no invented facts.

**Recommendation:** Review on feature branch; merge when satisfied. Do not deploy until owner gate.

---

## What changed

1. **Daily Brief engine** (`composeDailyBrief`) — deterministic outlook, 3–5 opportunities, calm watch list, one interesting observation; attaches Waypoint's Take.
2. **Today Outside UI** — compact Daily Brief block after Outdoor Score; Take nested inside Brief (single heading); Activity guide / windows / Explain why retained.
3. **Voice polish** — field-guide activity sentences varied; summary lines less robotic; opportunities skip repeated “comfortable temperatures”; Take no longer duplicates Interesting or activity explanations.
4. **CSS** — compact brief list/outlook styles; reduced-motion preserved; tablet stacks unchanged.
5. **Cache-bust** — `dash-rc3-s3` on dashboard + home shell assets.
6. **Capture** — `automation/capture-dashboard-rc3-sprint3.mjs` + screenshots under `docs/rebuild-2026/dashboard-rc3-sprint3/`.

## Why better

| Before (Sprint 2) | After (Sprint 3) |
|-------------------|------------------|
| Score + data bullets + Take that often repeated activity copy | Insight layer that answers “what’s worth noticing today?” |
| Opportunities only via scanning 10 activity cards | 3–5 highlight lines with distinctive cues + timing |
| Cautions buried in alerts / activity limits | Calm **Things to Watch** without sensationalism |
| No “why interesting” observation | One unique, data-backed detail users might miss |
| Take could echo activity explanations | Editorial Take distinct from Interesting + cards |

## Architecture one-liner

`OIP platform → intelligence.generate once → dailyBrief + score/activities/windows/take → Today Outside reuses pack` — non-blocking; no second generate on render; no new network.

| Module | Role |
|--------|------|
| `wds-dashboard-rebuild-intelligence.js` | v1.2.0-rc3-s3 — Daily Brief + voice polish |
| `wds-dashboard-rebuild-today.js` | v4.2.0-rc3-s3 — Brief UI inside Today Outside |
| `wds-dashboard-rebuild.css` | Compact brief layout |
| `wds-dashboard-rebuild-data.js` | Unchanged contract — pack still carries `today.intelligence` |

## Files modified

### Updated

| Path | Change |
|------|--------|
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intelligence.js` | Daily Brief + Take/summary/activity voice |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js` | Render Daily Brief; nest Take |
| `design-system/css/wds-dashboard-rebuild.css` | Brief styles |
| `automation/test-dashboard-rebuild-intelligence.mjs` | Sprint 3 contracts |
| `apps/dashboard/index.html` | `dash-rc3-s3` cache-bust |
| `index.html` | Home shell cache-bust aligned |
| `docs/ENGINEERING-PLAYBOOK.md` | Lessons Learned |

### New

| Path | Role |
|------|------|
| `automation/capture-dashboard-rc3-sprint3.mjs` | Fixture CDP capture |
| `docs/rebuild-2026/dashboard-rc3-sprint3-owner-review.md` | This review |
| `docs/rebuild-2026/dashboard-rc3-sprint3/*` | Screenshots + capture-meta |

## Tests

| Suite | Result |
|-------|--------|
| `test-dashboard-rebuild-intelligence.mjs` | **150 passed** |
| `test-dashboard-rebuild-phase1.mjs` | **88 passed** |
| `test-dashboard-rebuild-phase2.mjs` | **101 passed** |
| `test-dashboard-rebuild-phase3.mjs` | **103 passed** |
| `test-dashboard-mobile-tile-editing.mjs` | **39 passed** |
| `test-home-rc1.mjs` | **1 known fail** — `support experiences are Home architecture` (disclosed main/RC2.5 baseline; not introduced here) |

Workspace customization, prefs key, mobile tile editing Save/Cancel, and Phase 2 visual lock contracts remain green.

## Screens verified

Fixture CDP (`http://127.0.0.1:8765`, Pike County platform seed):

| File | View |
|------|------|
| `01-desktop-workspace.png` | Desktop Today Outside + Workspace |
| `02-desktop-daily-brief.png` | Daily Brief close-up |
| `03-phone-workspace.png` | Phone Today Outside |
| `capture-meta.json` | Probe: brief/outlook/opportunities/watch/interesting/take = true |

## Accessibility

- Hierarchy: `h2` Today Outside → `h3` Daily Brief / Activity guide / Best time windows → `h4` Brief subsections + Waypoint's Take.
- Lists use `aria-labelledby` on opportunity/watch blocks.
- Explain why remains native `<details>` / `<summary>` (≥44px target retained).
- Score retains `wds-sr-only` “out of 100”; confidence chips unchanged.
- `prefers-reduced-motion` still disables explain chevron transition.

## Performance

- Still **one** `generate()` per hydrate via `fromPlatform` → pack reuse.
- Daily Brief is pure composition over existing signals — **no extra API requests**.
- Non-blocking: Brief renders with the same intel hydrate as Score; waiting states remain honest when weather is not live.
- Compact CSS only; no layout redesign or heavy animation.

## Remaining opportunities

1. Optional: further diversify outlook phrasing by time-of-day (dawn vs afternoon open).
2. Optional: surface brief confidence only when it differs from Outdoor Score confidence.
3. Pre-existing `home-rc1` support.html assert (documented follow-up).
4. Pre-existing stale `test-dashboard-today-outside.mjs` Outdoor OS asserts (documented follow-up).
5. Live-network visual QA on owner device after merge gate (fixture captures only here).

## Final commit SHA

`335bcf24161ac8de83fabbcb628a7d75227ac62d` — feature commit. Branch tip is the latest docs pin on `feature/dashboard-rc3-sprint3-daily-brief`.

## Deployment status

**Not deployed.** Feature branch only — do not merge to main or ship Pages until owner approval.
