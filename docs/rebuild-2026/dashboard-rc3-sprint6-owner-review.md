# Dashboard RC3 Sprint 6 — Mobile Recovery & Functional Tile Catalog — Owner Review

**Status:** Owner Review: **Pending** — **not merged · not deployed**  
**Date:** 2026-07-24  
**Sprint:** Dashboard RC3 Sprint 6 — Mobile Recovery & Functional Tile Catalog  
**Authority:** Product standards · Engineering playbook · Rebuild architecture · RC3 release candidate  
**Starting SHA:** `3e64ab0879fbae36821319495f8744278994da49` (`origin/release/dashboard-rc3` tip — S1–S5 + RC stabilize)  
**Backup branch:** `backup/dashboard-rc3-pre-sprint6-functional` @ starting SHA  
**Branch:** `feature/dashboard-rc3-sprint6-functional-catalog`  
**Ending SHA:** `9a3d14983444be6914672f7451a8ae6831547af0` (branch tip; feature `accd50df1d9e483b8445741c04188657b890e63d`)
**Deployment status:** **Not deployed**  
**Merge status:** **Not merged**

---

## Executive summary

Phone layouts no longer collapse to half-width: at ≤40rem every standard tile is full-bleed, headers stack, and text wraps. Placeholder / Coming Soon tiles are **removed** from the catalog, picker, defaults, and Today Outside. The Customize library now offers **15 live OIP-backed tiles** (Conditions, Hourly, Daily, Alerts, Wind, Rain, Air Quality, UV Index, Sunrise & Sunset, Golden Hour, Blue Hour, Photo Conditions, Moon, Stargazing, River Gauge). Saved layouts that referenced retired ids soft-migrate without crashes or empty gaps. Today Outside summarizes **enabled tiles only**.

**Recommendation:** Review on the feature branch; merge when satisfied. Do **not** deploy until owner gate.

---

## Production issues addressed

| Issue | Root cause | Fix |
|-------|------------|-----|
| Cards half-width on iPhone (Air Quality, Rivers) | 12-col spans + tablet `span 6` / `data-columns="2"` specificity; narrow cards felt “collapsed” | Phone MQ forces single-column grid + `grid-column: 1 / -1` for all `data-columns` |
| Title / category overlap, clipped values | Head flex + `white-space: nowrap` on category; no `min-width: 0` on title/values | Stack head on phone; allow wrap; fact values `overflow-wrap` |
| Inconsistent widths | Mix of sm/md spans on narrow viewports | All phone tiles same full width |
| Coming Soon / Waiting placeholders beside live tiles | 6 catalog stubs returned `status: "placeholder"` | Removed stubs; every catalog entry is live against OIP |
| Catalog too small to justify Customize | Only 4 live widgets | Expanded to 15 functional adapters from existing weather / daylight / air / alerts / USGS |

---

## What changed

1. **Mobile CSS recovery** — `wds-dashboard-rebuild.css` phone band (≤40rem): single-column grid, full-bleed widgets for columns 1/2/3, stacked heads, wrap-safe titles/facts, no horizontal scroll chrome.
2. **Functional catalog (15)** — registry + data adapters for hourly, daily, wind, rain, UV, golden, blue, photo, moon, stargazing; alerts + rivers promoted to live; placeholders removed.
3. **Prefs soft migration** — `ph-astronomy` → `ph-moon`; unknown/retired ids (`ph-photography`, `ph-wildlife`, `ph-trails`, `ph-travel`) dropped from enabled/order/favorites.
4. **Today Outside** — `composeTodayLines(platform, { enabled })`; summary prefers enabled-tile lines over broad intelligence bullets.
5. **Customize copy** — picker lede no longer mentions Coming Soon; badges are Available only.
6. **Cache-bust** — `dash-rc3-s6` on root + `apps/dashboard` shells.
7. **Tests + captures** — phase1–3 / home-rc1 / mobile editing / intelligence updated; new `test-dashboard-rc3-sprint6-functional.mjs`; screenshots under `docs/rebuild-2026/dashboard-rc3-sprint6/`.

## Why better

| Before | After |
|--------|-------|
| Half-width / overlapping phone cards | Full-width consistent tiles 320–430 CSS px |
| 4 live + 6 Coming Soon | 15 live, 0 placeholders |
| Today Outside summarized everything | Summarizes active tiles only |
| Saved layouts could retain dead ids | Soft migrate / drop without empty gaps |
| Customize felt unfinished | Real catalog worth browsing |

## Architecture one-liner

`OIP platform → buildWidgetPayload(id) × 15 live ids → workspace + picker; composeTodayLines(enabled) → Today Outside` — no new remote APIs; extend Rebuild adapters only.

| Module | Role |
|--------|------|
| `wds-dashboard-rebuild-data.js` | v3.3.0-rc3-s6 — 15 adapters + enabled-aware Today lines |
| `wds-dashboard-rebuild-registry.js` | v3.3.0-rc3-s6 — functional catalog only |
| `wds-dashboard-rebuild-prefs.js` | Soft-migrate retired tile ids |
| `wds-dashboard-rebuild-today.js` | Prefer enabled-tile summary |
| `wds-dashboard-rebuild.css` | Phone full-width + wrap |

## Working tile catalog (15)

| ID | Title | Library | Default visible |
|----|-------|---------|-----------------|
| `ph-conditions` | Conditions | Weather | yes |
| `ph-hourly` | Hourly | Weather | yes |
| `ph-daily` | Daily | Weather | no |
| `ph-alerts` | Alerts | Safety | yes |
| `ph-wind` | Wind | Weather | no |
| `ph-rain` | Rain | Weather | no |
| `ph-air` | Air Quality | Weather | yes |
| `ph-uv` | UV Index | Weather | no |
| `ph-light` | Sunrise & Sunset | Photography | yes |
| `ph-golden` | Golden Hour | Photography | no |
| `ph-blue` | Blue Hour | Photography | no |
| `ph-photo` | Photo Conditions | Photography | no |
| `ph-moon` | Moon | Astronomy | yes |
| `ph-stargazing` | Stargazing | Astronomy | no |
| `ph-rivers` | River Gauge | Water | no |

**Placeholder tiles removed:** `ph-photography`, `ph-wildlife`, `ph-trails`, `ph-travel`, and retired combined `ph-astronomy` (migrates → `ph-moon`).

## Files modified

### Updated
- `design-system/css/wds-dashboard-rebuild.css`
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-{data,registry,prefs,today,customize,rebuild}.js`
- `apps/dashboard/index.html`, `index.html` (cache-bust)
- Dashboard automation tests + mobile capture scripts

### Added
- `automation/test-dashboard-rc3-sprint6-functional.mjs`
- `automation/capture-dashboard-rc3-sprint6.mjs`
- `docs/rebuild-2026/dashboard-rc3-sprint6/*` (screenshots + `capture-meta.json`)
- This owner review

## Test / build results

| Suite | Result |
|-------|--------|
| `test-dashboard-rebuild-phase1.mjs` | **99 passed** |
| `test-dashboard-rebuild-phase2.mjs` | **131 passed** |
| `test-dashboard-rebuild-phase3.mjs` | **134 passed** |
| `test-dashboard-rc3-sprint6-functional.mjs` | **74 passed** |
| `test-dashboard-mobile-tile-editing.mjs` | **45 passed** |
| `test-dashboard-rebuild-intelligence.mjs` | **256 passed** |
| `capture-dashboard-rc3-sprint6.mjs` | **All mobile gates passed** (320/375/390/393/430) |
| Production build | **N/A** (static site) |
| Lint / typecheck | **N/A** (no project-level lint/tsc scripts) |

Note: `test-home-rc1.mjs` still reports the pre-existing `support.html` architecture assert failure documented in RC2 follow-ups — unrelated to this sprint; Dashboard default assertions in that file were updated and pass.

## Mobile verification (320–430)

Screenshots: `docs/rebuild-2026/dashboard-rc3-sprint6/`

| Viewport | Workspace | Gate |
|----------|-----------|------|
| 320×568 | `phone-320x568-workspace.png` | PASS — tiles 293px = grid width |
| 375×667 | `phone-375x667-workspace.png` | PASS |
| 390×844 | `phone-390x844-workspace.png` + customize | PASS — 12+ picker items, no Coming Soon |
| 393×852 | `phone-393x852-workspace.png` | PASS |
| 430×932 | `phone-430x932-workspace.png` | PASS |

Gates checked: full-width (not half), no Coming Soon text, no horizontal page scroll, consistent widths.

## Customization / migration

- Browse / add / remove / reorder / save / reload / reset — existing Customize + draft prefs unchanged.
- Picker lists only working tiles.
- Legacy prefs with `ph-astronomy` / placeholder ids normalize without empty widget frames.

## Today Outside

- Summary bullets from `composeTodayLines` filtered by `prefs.enabled`.
- No Coming Soon / placeholder provider copy in brief lines path.
- Score / Take / Discovery remain intelligence surfaces; summary no longer advertises unselected tiles.

## Release gates checklist

- [x] Phone tiles full width 320–480 CSS px band (≤40rem)
- [x] No title/category overlap / clipped values on captured phones
- [x] No Coming Soon / Waiting placeholder tiles in catalog or defaults
- [x] ≥12 functional tiles (15)
- [x] Honest Live / Estimated / Unavailable / Cached trust chips
- [x] Customize picker working-only
- [x] Soft migration for deleted tile ids
- [x] Today Outside respects enabled tiles
- [x] Mobile captures + automation green
- [x] Nothing merged to main
- [x] Nothing deployed
- [ ] **Owner Review: Pending**

## Risks / follow-ups

1. **UV / hourly richness** depends on Live Engine / weather package fields — when absent, tiles show honest Unavailable / partial facts (never invented numbers).
2. **River Gauge** requires USGS nearest site; `no-nearby` surfaces Unavailable with disclaimer.
3. **Tablet band (40–52rem)** still uses 2-up for sm/md — intentional; phones forced to 1-up.
4. Pre-existing `support.html` / `test-dashboard-today-outside.mjs` hygiene items remain outside this Dashboard sprint.

## Confirmation

- **Not merged** to `main` or `release/dashboard-rc3`.
- **Not deployed**.
- Feature branch pushed for owner review only.

---

**Owner Review: Pending**
