# Sheds — Final iPhone Field UX Validation

**Branch:** `release/sheds-2-field-validation`  
**Validation date:** 2026-08-24  
**Safe-area simulation:** `--sheds-safe-top: 47px`, `--sheds-safe-bottom: 34px`  
**Method:** Headless Chrome CDP + geometry gaps (≥6px breathing room) + visual review of PNGs

## Verdict

**Pass for the primary field state.** On 390×844 portrait with Safari-like safe areas, **active search + SEARCH prompt open + GPS/YOU chip** is collision-free with intentional gaps (≥9px strip→prompt, ≥26px prompt→YOU). Map remains the dominant surface. Desktop left briefing / right rail unchanged; pre-existing desktop `prompt×here` stacking was not worsened as a mobile fix target.

## 1. Problems found (evidence-backed)

| Issue | Evidence | Severity |
|---|---|---|
| SEARCH prompt (~115px tall when actions wrap at ~390px) taller than reserved YOU offset (`--sheds-prompt-stack` too short) | `prompt×here overlap≈13.4` on 390; 375 OK only because `max-width:380` override | **Fixed** |
| Session strip slightly taller after ≥42px End Search / Locate → strip-end short by ~1px | `strip×prompt overlap≈0.6` | **Fixed** |
| Landscape `844×390` strip-end undersized with safe-area sim | `strip×prompt overlap≈8.6` | **Fixed** |
| Locate / End Search under ~42px outdoor tap target | Locate 40×40, End ~37.6 | **Fixed** (42.4 / 42) |
| Map & layers discoverability after Leaflet MAP control removal | First-time path only via More | **Improved** (More lede names Map & layers) |
| Desktop `prompt×here` overlap ~20.6 | Pre-existing; out of mobile scope | **Known / unchanged** |

## 2. Files changed

- `apps/shed-hunting/css/sheds-map.css` — clearance vars, touch targets, narrow/landscape overrides
- `apps/shed-hunting/map/index.html` — More sheet lede mentions Map & layers
- `reports/sheds-mobile-final-iphone-qa/*` — this package
- `docs/ENGINEERING-PLAYBOOK.md` — Lessons Learned

## 3. What changed and why

- Introduced `--sheds-mobile-chrome-gap` and raised `--sheds-mobile-header-end` / `--sheds-mobile-strip-end` so header → strip → prompt/map-ctrls keep ≥~8–12px air under safe-area insets.
- Set `--sheds-prompt-stack: 8.85rem` (10.25rem ≤380px, 10.35rem ≤359px) so the YOU chip clears a fully wrapped SEARCH prompt (~115–132px measured).
- Raised `--sheds-map-ctrl-size` to `2.65rem` and End Search `min-height: 2.625rem` / `min-width: 5.75rem` for outdoor taps without shrinking below ~42px.
- Landscape short-height overrides: larger strip-end + prompt-stack so session+prompt stays usable without shrinking portrait controls.
- More lede: “including Map & layers” — smallest discoverability cue without restoring a permanent MAP control.

## 4. Primary 390 active-search + SEARCH prompt + YOU

**Collision-free: yes.**

Measured (`final-390-active-prompt-you.json`):

- hud → strip gap ≈ 12.9px  
- strip → prompt / mapCtrls gap ≈ 9.0px  
- prompt → here gap ≈ 26.6px  
- Locate 42.4×42.4; End Search h=42; not clipped  
- collisions: `[]`; tight (&lt;6px): `[]`

Screenshot: `final-390-active-prompt-you.png` (also `03-390-active-prompt-you-PRIMARY.png` from earlier pass)

## 5. Map & Layers discoverability

**Sufficient for this pass.** Leaflet MAP control stays hidden on field chrome. Path is **More → Map & layers**, reinforced by the More sheet lede. No permanent large MAP control restored (map-first preserved). Remaining risk: first-time users who never open More — acceptable trade for a clean map; do not overfit with extra chrome.

## 6. Remaining known imperfections

- Desktop `prompt×here` stacking (pre-existing; not part of this mobile repair).
- Active-search + open SEARCH prompt still consumes meaningful top chrome by design (needed for the action); map still dominates mid-viewport.
- Headless CDP may focus the skip link (“Skip to map”) in screenshots — not a phone Safari default.
- Landscape remains dense; usable and collision-free under safe-area sim, but not spacious.
- On very short heights (e.g. 320×568), YOU chip + dock + briefing peek compete for bottom third — expected on small phones.

## 7. Test / check results

| Suite | Result |
|---|---|
| `node automation/test-sheds-field-ux.mjs` | PASS (36) |
| `SHEDS_CDP=1 node automation/test-sheds-field-ux.mjs` | PASS (48) |
| `node automation/test-sheds-phase4-ux-polish.mjs` | (see run log) |
| `node automation/test-sheds-map.mjs` | PASS (42) |
| `node automation/test-sheds-todays-search.mjs` | PASS |
| `node automation/test-sheds-sprint6.mjs` | PASS |
| `node automation/test-app-surface-isolation.mjs` | (see run log) |
| `node --check apps/shed-hunting/js/*.js` | PASS |
| Custom CDP matrix (`/tmp/sheds-final-qa.mjs`) | All mobile states: **0 collisions**, **0 tight &lt;6px** |

## 8. Screenshot / report paths

Directory: `reports/sheds-mobile-final-iphone-qa/`

| State | Screenshot | Metrics |
|---|---|---|
| 390 portrait initial | `final-390-initial.png` | `final-390-initial.json` |
| 390 active search | `final-390-active.png` | `final-390-active.json` |
| **390 active + SEARCH + YOU (PRIMARY)** | `final-390-active-prompt-you.png` | `final-390-active-prompt-you.json` |
| 390 Field Briefing expanded | `final-390-briefing-expanded.png` | `final-390-briefing-expanded.json` |
| 320 narrow session strip | `final-320-strip-long.png` | `final-320-strip-long.json` |
| 375 / 430 active+prompt | `final-375-*.png`, `final-430-*.png` | matching `.json` |
| 844×390 landscape | `final-844x390-landscape.png` | `final-844x390-landscape.json` |
| 1280 desktop regression | `final-1280-desktop.png` | `final-1280-desktop.json` |
| More / Map & layers cue | `final-390-more.png` | `final-390-more.json` |

## 9. Commit hash

Filled after commit: see `git rev-parse HEAD` on `release/sheds-2-field-validation`.
