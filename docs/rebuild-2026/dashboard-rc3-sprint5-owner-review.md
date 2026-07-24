# Dashboard RC3 Sprint 5 — Personal Workspace — Owner Review

**Status:** Awaiting owner review — **not merged · not deployed**  
**Date:** 2026-07-24  
**Sprint:** Dashboard RC3 Sprint 5 — Personal Workspace  
**Authority:** Product standards · Engineering playbook · Rebuild architecture · Sprint 4 owner review  
**Base:** `feature/dashboard-rc3-sprint4-discovery` @ `d9bce29` (Sprint 4 docs tip; feature `11c1a6f`)  
**Branch:** `feature/dashboard-rc3-sprint5-personal-workspace`  
**Final commit SHA:** `dbebeae1c0e1f0754e06a46cc01c2e8a3592a16e` (feature; tip `120d9d2fb5c953e05ff3e60f2966d268e800f6e6`)  
**Deployment status:** **Not deployed**

---

## Executive summary

Today Outside already understands conditions. Sprint 5 teaches it what the **user** cares about. A lightweight **Personal Workspace** interest profile (Photography, Hiking, Wildlife, Birding, Astronomy, Gardening, Fishing, Rivers & Water, Weather, General Outdoors) lives in the same prefs key as tile layout. Customize lets people enable, rank, disable, and restore defaults. Outdoor Intelligence then **reorders emphasis only** — activities, Discovery cards, Outlook, and Waypoint’s Take — without hiding alerts or inventing data. Default stays balanced **General Outdoors**. Feels like “My Dashboard,” not a second dashboard.

**Recommendation:** Review on feature branch; merge when satisfied. Do not deploy until owner gate.

---

## What changed

1. **Interest profiles in prefs** — same `waypoint-dashboard-rebuild-prefs-v1` key; `interests: string[]` ordered by priority; defaults `["general"]`; draft Save/Cancel unchanged.
2. **Intelligence prioritization** — `generate({ interests })` reorders activities, windows, Discovery cards, opportunities, and educational preference; Take/Outlook adapt calmly.
3. **Alerts always first** — watch list and Take still lead with official alerts when present; interests never outrank public safety.
4. **Customize UI** — “My interests” panel with On/Off, Up/Down, priority preview, restore interest defaults — above the widget grid, same Save/Cancel bar.
5. **CSS + cache-bust** — interests styles + mobile ≥44px controls; `dash-rc3-s5`.
6. **Capture** — `automation/capture-dashboard-rc3-sprint5.mjs` + screenshots under `docs/rebuild-2026/dashboard-rc3-sprint5/`.

## Why better

| Before (Sprint 4) | After (Sprint 5) |
|-------------------|------------------|
| Same emphasis for every visitor | Photography-first / wildlife / astronomy shift what rises first |
| Discovery order fixed by composition | Cards reorder by interests; unsupported cards still omitted |
| Take / Outlook generic calm voice | Subtle interest cues; still encourage exploring beyond the lens |
| Customize = tiles only | Interests + tiles in one Customize experience |
| No personal memory (local) | Local-first interest order on the existing prefs key |

## Architecture one-liner

`prefs.interests → fromPlatform/generate once → prioritized activities + discovery + brief/take → Today Outside reuses pack` — presentation only; no new APIs; alerts stay highest priority.

| Module | Role |
|--------|------|
| `wds-dashboard-rebuild-prefs.js` | v3.2.0-rc3-s5 — interest catalog, normalize, move, restore |
| `wds-dashboard-rebuild-intelligence.js` | v1.4.0-rc3-s5 — prioritize + Take/Outlook adaptation |
| `wds-dashboard-rebuild-customize.js` | v3.2.0-rc3-s5 — My interests UI |
| `wds-dashboard-rebuild-data.js` / `today.js` / `rebuild.js` | Pass interests into generate; avoid second generate |
| `wds-dashboard-rebuild.css` | Interests panel + mobile touch targets |

## Files modified

### Updated

| Path | Change |
|------|--------|
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js` | Interest storage API |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intelligence.js` | Personalization prioritization |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js` | Interests UI + actions |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js` | Pass interests into generate |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js` | Resolve interests on fallback generate |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js` | Wire prefs interests into todayContext |
| `design-system/css/wds-dashboard-rebuild.css` | Interests styles + a11y touch |
| `automation/test-dashboard-rebuild-intelligence.mjs` | Sprint 5 contracts |
| `automation/test-dashboard-mobile-tile-editing.mjs` | Interests + draft Save/Cancel |
| `apps/dashboard/index.html` / `index.html` | `dash-rc3-s5` cache-bust |
| `docs/ENGINEERING-PLAYBOOK.md` | Lessons Learned |

### New

| Path | Role |
|------|------|
| `automation/capture-dashboard-rc3-sprint5.mjs` | Fixture CDP capture |
| `docs/rebuild-2026/dashboard-rc3-sprint5-owner-review.md` | This review |
| `docs/rebuild-2026/dashboard-rc3-sprint5/*` | Screenshots + capture-meta |

## Tests

| Suite | Result |
|-------|--------|
| `test-dashboard-rebuild-intelligence.mjs` | **243 passed** |
| `test-dashboard-rebuild-phase1.mjs` | **88 passed** |
| `test-dashboard-rebuild-phase2.mjs` | **101 passed** |
| `test-dashboard-rebuild-phase3.mjs` | **103 passed** |
| `test-dashboard-mobile-tile-editing.mjs` | **45 passed** |

Coverage added: interest storage/ordering, defaults/restore, Dashboard prioritization, Take adaptation, Discovery ordering, alerts-first with interests, Customize UI, draft Save/Cancel compatibility, determinism, responsive CSS hooks.

## Screens verified

Fixture CDP (`http://127.0.0.1:8765`, Pike County platform seed):

| File | View |
|------|------|
| `01-desktop-workspace.png` | Desktop Today Outside (photography-first) |
| `02-desktop-customize-interests.png` | Customize · My interests |
| `03-desktop-discovery.png` | Brief + Discovery close-up (photo/sky lead) |
| `04-phone-workspace.png` | Phone Today Outside (astronomy-first) |
| `05-phone-customize-interests.png` | Phone Customize interests + Save/Cancel |
| `capture-meta.json` | Probe: interests reorder + customize rows = 10 |

## Accessibility

- Interests section: `h2` “My interests”; list `role="list"`; On/Off uses `aria-pressed`; Up/Down labelled; priority preview `aria-live="polite"`.
- Disabled Up/Down when not applicable; touch targets ≥44px on phone with existing customize bar.
- Alerts / public safety copy unchanged in priority.
- `prefers-reduced-motion` unchanged; no new hover-only controls.
- Customize Save/Cancel draft lifecycle preserved (Escape cancels).

## Performance

- Still **one** `generate()` per hydrate; interests are an options argument only.
- Prioritization is pure in-memory sort — **no extra API requests**.
- Compact CSS for interests panel; no layout redesign.
- Batch microbench still under 500ms for 40× generate in the intelligence suite.

## Remaining opportunities

1. Optional: soft-suggest widget favorites from top interests (still local, still opt-in).
2. Optional: show a one-line “Emphasizing Photography · Hiking” chip on Today Outside when not balanced.
3. Optional: diversify Outlook phrasing further so multi-interest ranks read less formulaic.

## Risks

- Interest emphasis could feel repetitive if every section repeats the same cue — mitigated by one Take cue + Outlook “lens / explore beyond” phrasing.
- Phase 3 bans Outdoor OS phrases (`Matters most`) — interest copy must avoid those tokens.
- Existing stored prefs without `interests` normalize to General Outdoors on load.

## Owner ask

Review Personal Workspace on the feature branch. Confirm photography / wildlife / astronomy emphasis feels calm and useful, Customize is lightweight enough, and alerts still clearly lead. **Do not merge or deploy** until you approve.
