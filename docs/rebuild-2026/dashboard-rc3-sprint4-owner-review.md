# Dashboard RC3 Sprint 4 — Discovery Engine — Owner Review

**Status:** Awaiting owner review — **not merged · not deployed**  
**Date:** 2026-07-24  
**Sprint:** Dashboard RC3 Sprint 4 — Discovery Engine  
**Authority:** Product standards · Engineering playbook · Rebuild architecture · Sprint 3 owner review  
**Base:** `feature/dashboard-rc3-sprint3-daily-brief` @ `72e30e4` (Sprint 3 docs tip; feature `335bcf2`)  
**Branch:** `feature/dashboard-rc3-sprint4-discovery`  
**Final commit SHA:** `11c1a6fed02628e29649eedeee9105aca22e149c` (feature; tip `368984122ed4035f66f16203e19eb95c46c2b5f7`)
**Deployment status:** **Not deployed**

---

## Executive summary

Today Outside now includes a quiet **Discovery** layer beside Daily Brief: independent cards (Sky, Nature, Seasonal, Photography, Astronomy, Water) only when signals support them, plus one **Educational Moment** per day and a compact **This Week Outside** outlook of meaningful near-term changes. Voice stays porch-naturalist — curious, observational, educational. No redesign, no second dashboard, no new APIs, no invented facts.

**Recommendation:** Review on feature branch; merge when satisfied. Do not deploy until owner gate.

---

## What changed

1. **Discovery engine** (`composeDiscovery`) — data-backed cards, educational rotation, weekly outlook composed inside the same `generate()` pass as Daily Brief.
2. **Today Outside UI** — compact Discovery section after Daily Brief (beside Brief on wide viewports; stacked on tablet/phone).
3. **Signal reuse** — `dailyRows` extracted from existing weather package for multi-day deltas; no extra fetch.
4. **CSS** — Discovery card grid + wide two-column Brief/Discovery; reduced-motion preserved.
5. **Cache-bust** — `dash-rc3-s4` on dashboard + home shell assets.
6. **Capture** — `automation/capture-dashboard-rc3-sprint4.mjs` + screenshots under `docs/rebuild-2026/dashboard-rc3-sprint4/`.

## Why better

| Before (Sprint 3) | After (Sprint 4) |
|-------------------|------------------|
| Daily Brief answers “what’s worth noticing today?” | Discovery quietly points out domain notes users might not have asked for |
| Education buried in Explain why | One Educational Moment / day, &lt;75 words, rotating topics |
| No compact weekly change summary | This Week Outside lists only meaningful hourly / multi-day deltas |
| Cards would risk inventing content | Unsupported domains omit cards entirely |
| Brief alone filled the insight column | Wide layout pairs Brief + Discovery without a redesign |

## Architecture one-liner

`OIP platform → intelligence.generate once → dailyBrief + discovery + score/activities/windows/take → Today Outside reuses pack` — non-blocking; no second generate on render; no new network.

| Module | Role |
|--------|------|
| `wds-dashboard-rebuild-intelligence.js` | v1.3.0-rc3-s4 — Discovery + educational rotation + weekly outlook |
| `wds-dashboard-rebuild-today.js` | v4.3.0-rc3-s4 — Discovery UI after Daily Brief |
| `wds-dashboard-rebuild.css` | Compact Discovery + wide Brief/Discovery columns |
| `wds-dashboard-rebuild-data.js` | Unchanged contract — pack still carries `today.intelligence` (now includes `discovery`) |

## Files modified

### Updated

| Path | Change |
|------|--------|
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intelligence.js` | Discovery composition + dailyRows signals |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js` | Render Discovery / Educational Moment / This Week Outside |
| `design-system/css/wds-dashboard-rebuild.css` | Discovery styles + responsive pairing |
| `automation/test-dashboard-rebuild-intelligence.mjs` | Sprint 4 Discovery contracts |
| `apps/dashboard/index.html` | `dash-rc3-s4` cache-bust |
| `index.html` | Home shell cache-bust aligned |
| `docs/ENGINEERING-PLAYBOOK.md` | Lessons Learned |

### New

| Path | Role |
|------|------|
| `automation/capture-dashboard-rc3-sprint4.mjs` | Fixture CDP capture |
| `docs/rebuild-2026/dashboard-rc3-sprint4-owner-review.md` | This review |
| `docs/rebuild-2026/dashboard-rc3-sprint4/*` | Screenshots + capture-meta |

## Tests

| Suite | Result |
|-------|--------|
| `test-dashboard-rebuild-intelligence.mjs` | **201 passed** |
| `test-dashboard-rebuild-phase1.mjs` | **88 passed** |
| `test-dashboard-rebuild-phase2.mjs` | **101 passed** |
| `test-dashboard-rebuild-phase3.mjs` | **103 passed** |
| `test-dashboard-mobile-tile-editing.mjs` | **39 passed** |
| `test-home-rc1.mjs` | **1 known fail** — `support experiences are Home architecture` (disclosed main/RC2.5 baseline; not introduced here) |

Coverage added: Discovery generation, educational rotation, weekly outlook, missing-data card omission, responsive CSS contracts, determinism, performance (40× generate &lt;500ms), a11y headings/list roles.

Workspace customization, prefs key, mobile tile editing Save/Cancel, and Phase 2 visual lock contracts remain green.

## Screens verified

Fixture CDP (`http://127.0.0.1:8765`, Pike County platform seed):

| File | View |
|------|------|
| `01-desktop-workspace.png` | Desktop Today Outside + Workspace |
| `02-desktop-discovery.png` | Daily Brief + Discovery close-up |
| `03-phone-workspace.png` | Phone Today Outside (stacked Discovery) |
| `capture-meta.json` | Probe: discovery/edu/week = true; cards = 6 |

## Accessibility

- Hierarchy: `h2` Today Outside → `h3` Daily Brief / Discovery / Activity guide / Best time windows → `h4` Brief + Discovery subsections.
- Discovery cards use `role="list"` / `role="listitem"`; Educational Moment and This Week Outside labelled via `aria-labelledby`.
- Explain why remains native `<details>` / `<summary>`.
- Score retains `wds-sr-only` “out of 100”; confidence chips unchanged.
- `prefers-reduced-motion` still disables explain chevron transition.
- Touch-friendly stacking on ≤52rem; no new hover-only controls.

## Performance

- Still **one** `generate()` per hydrate via `fromPlatform` → pack reuse (Discovery rides along).
- Discovery is pure composition over existing signals / hourly / daily rows — **no extra API requests**.
- Non-blocking: Discovery renders with the same intel hydrate as Score/Brief.
- Compact CSS only; no layout redesign or heavy animation.
- Batch microbench: 40× `generate()` under 500ms in the intelligence suite.

## Remaining opportunities

1. Optional: further diversify Educational Moment topics with daylight length when present.
2. Optional: surface Discovery confidence only when it differs from Outdoor Score confidence.
3. Pre-existing `home-rc1` support.html assert (documented follow-up).
4. Pre-existing stale `test-dashboard-today-outside.mjs` Outdoor OS asserts (documented follow-up).
5. Live-network visual QA on owner device after merge gate (fixture captures only here).

## Final commit SHA

Feature commit: `11c1a6fed02628e29649eedeee9105aca22e149c`

## Deployment status

**Not deployed.** Feature branch only — do not merge to main or deploy until owner review.
