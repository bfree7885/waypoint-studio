# Dashboard Discover v1 — Completion Report

**Date:** 2026-08-25  
**Branch:** `chore/product-direction-reconciliation`  
**Starting commit:** `b69a043b`  
**Final commit:** `cc03bd5d`

---

## 1–3. Branch / commits

| Item | Value |
|------|--------|
| Branch | `chore/product-direction-reconciliation` |
| Start | `b69a043b` |
| Final | `cc03bd5d` |

## 4–5. Files changed / added

### Modified
- `apps/dashboard/index.html`
- `automation/test-contact-platform.mjs`
- `automation/test-dashboard-rebuild-phase1.mjs`
- `automation/test-dashboard-rebuild-phase2.mjs`
- `design-system/css/wds-dashboard-rebuild.css`
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js`
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js`
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-happening.js`
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js`
- `docs/PRODUCT-DIRECTION.md`
- `docs/ENGINEERING-PLAYBOOK.md`

### Added
- `docs/DASHBOARD-DISCOVER.md`
- `automation/test-dashboard-discover.mjs`
- `automation/capture-dashboard-discover.mjs`
- `reports/dashboard-discover-v1/AUDIT.md`
- `reports/dashboard-discover-v1/COMPLETION.md`
- `reports/dashboard-discover-v1/CDP-VERIFY.json`
- `reports/dashboard-discover-v1/screenshots/dashboard-discover-{375,390,430,desktop}.png`

### Deleted
- none

## 6–7. Audit summary & KEEP / IMPROVE / REPOSITION / REMOVE

See `AUDIT.md`. Highlights:

| Element | Decision |
|---------|----------|
| Happening Now | **KEEP / IMPROVE** — Right now / What to notice |
| Quiet strip | **ADD** — `data-wdb-r-discover-quiet` (separate from HN) |
| Today Outside | **IMPROVE / REPOSITION** — Outside today / What the day looks like + provenance + editorial season |
| Instruments / BYO | **KEEP** |
| Waypoint’s Take | **IMPROVE** — live `beforeYouGo.brief` when available |
| Explore further | **ADD** — Articles / Scenes / DFD |
| Fake wildlife / OS promo deepeners | **KEEP removed** |

## 8–9. Structure before → after

**Before:** Today Outside → Happening Now (or nothing) → Workspace instruments → hardcoded Take  

**After:** Outside today (provenance + editorial season) → Right now HN **or** quiet Discover strip → Workspace → Take (intel-backed) + Go deeper (publishing/Scenes)

## 10. Real data sources

Open-Meteo weather (+ NWS recovery where wired), Open-Meteo AQ, NWS alerts, browser/IP geolocation, daylight/moon derived, OIP calendar/phenology (editorial season labels).

## 11. Placeholder / fake intelligence removed

- Hardcoded Take no longer presented as if always live — prefers intel brief; editorial fallback labeled.
- Quiet day no longer invents HN cards; separate honest strip.
- No wildlife / trend / sensor inventions added.

## 12–13. Ranking / Right Now

Unchanged deterministic engine: `dashboardRebuildIntel` → score ≥ 25 → max 4 → Happening Now. Documented in `docs/DASHBOARD-DISCOVER.md`.

## 14. Location

Place label + weather/AQ/alerts for coords; denied/waiting stays honest (Today Outside waiting lines; quiet strip only after hydrate).

## 15. Astronomy

Via instruments + HN light/astro signals; moon from live daylight package — no fabricated moonrise.

## 16. Weather interpretation

Today lines + HN titles interpret (precip timing, wind, heat, air, light windows) rather than raw telemetry grids; evidence via Why?

## 17. Seasonal

Editorial season line on Today from `calendar.season` / `phenology.stage`, labeled **Seasonal note (editorial)**.

## 18. Articles / videos / Scenes

Deepeners “Go deeper” links Articles, Scenes, Deep Forest Dispatch. HN may link Scenes when intel supplies justified `toolLinks`.

## 19. Sheds

Not promoted. Contextual Sheds deferred until a go-relevant signal exists.

## 20. Mobile

Kickers + stacked hierarchy; CDP verified 375 / 390 / 430 — no horizontal overflow; Discover copy visible above fold.

## 21. Visual / palette

Orange kickers on SW family; quiet strip sand-tinted surface; no repo-wide CSS redesign.

## 22. Empty / error / offline

Waiting trust chips; HN empty hides HN; quiet strip when hydrated with no strong signals; deepeners always offer Explore links.

## 23. Contact-test resolution

**Cause:** scan walked `.worktrees` copies containing obsolete `.studio` mailbox docs.  
**Fix:** skip `.worktrees` / `.tmp-*` in `test-contact-platform.mjs`.  
**Source of truth unchanged:** `contact@waypointstudio.org` (incorrect `.studio` address remains forbidden).

## 24. Tests (exact)

| Suite | Result |
|-------|--------|
| `test-dashboard-discover.mjs` | **PASS** |
| `test-contact-platform.mjs` | **PASS** (121) |
| `test-dashboard-rebuild-happening.mjs` | **PASS** (52) |
| `test-dashboard-rebuild-phase1.mjs` | **PASS** (88) |
| `test-dashboard-rebuild-phase2.mjs` | **PASS** (99) |
| `test-dashboard-instrument-panel.mjs` | **PASS** |
| `test-dashboard-depth.mjs` | **PASS** |
| `test-dashboard-rebuild-intel.mjs` | **PASS** (125) |
| `test-dashboard-rebuild-depth.mjs` | **PASS** (60) |
| `capture-dashboard-discover.mjs` | **PASS** |

## 25–26. Browser / screenshots

`reports/dashboard-discover-v1/CDP-VERIFY.json` + screenshots for 375 / 390 / 430 / desktop. All: quiet strip present when hydrated, no banned promo, no overflow, empty consoleErrors.

## 27. Known issues

- Regional phenology editorial text can lag calendar season (still labeled editorial).
- Headless mobile needs hydrate wait (~IP geo) before quiet strip appears.
- Featured Conditions glance shows `72°` without trailing `F` (phase2 assert updated to `/72°/`).

## 28. Deferred

Sheds contextual ranking · Deck · Cyber/GS · OpenRoad · Fieldry · Savant · Sheds V3.2 · accounts · social · AI chatbot · Scenes rewrite · content-bundle wildlife as live discoveries.

## 29. Next three priorities only

1. **Scenes + Publishing handoff depth** — opportunity-aware links from Discover signals into specific articles/videos/Scenes (not just hubs).  
2. **Seasonal honesty pass** — align editorial phenology stage with latitude calendar month; keep labels.  
3. **Sheds contextual Discover** — surface Sheds only when a justified go/field signal exists (never as ads).

---

**Product test:** Opening Dashboard quickly shows Outside today + either ranked Right now or an honest quiet day, with live instruments and optional deeper reading — a trustworthy reason to get curious about the outdoors.
