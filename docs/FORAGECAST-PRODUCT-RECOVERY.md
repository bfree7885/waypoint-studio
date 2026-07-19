# ForageCast Product Recovery — Phase 1 Report

**Date:** 2026-07-18  
**Scope:** Transform ForageCast from a data-forward prototype into a polished outdoor intelligence application.  
**Repo:** `waypoint-studio` (`apps/foragecast/`)  
**Commit status:** Not committed / not pushed (per owner instruction).

---

## Mission outcome

ForageCast’s first screen now answers:

> **What should I be looking for today, and why?**

via an **Outdoor Intelligence Summary** — species attention + interpreted conditions — before any tables or long editorial scroll.

---

## Changelog (Phase 1)

### User experience
- Rebuilt home as **summary-first** (species confidence + condition readings, each with WHY).
- Replaced pillar-centric local strip with **task navigation**: Overview, Today’s Conditions, Species, Map, Season Timeline, Recent Weather, Habitats, Learn, Journal, Settings.
- Added polished **species pages** (status, confidence, habitat, ID reminders, look-alikes, ethics, week trend, confidence explanation).
- Added **Today’s Conditions** operational briefing (interpreted, not raw charts).
- Added **Season Timeline** (Beginning → Developing → Peak → Declining → Ending).
- Added dedicated **Map**, **Weather**, **Habitats**, **Learn**, **Journal** (private localStorage), and **Settings** surfaces.
- Reduced home clutter (removed long stacked editorial/video/citizen blocks from the first path).

### Architecture
- New modules:
  - `foragecast-intelligence.js` — summary, briefing, season phase, trends
  - `foragecast-fetch.js` — timeouts, memory cache, stale-cache fallback, freshness labels
  - `foragecast-shell.js` / `foragecast-views.js` — shared task-page boot + renderers
  - `css/foragecast-recovery.css` — summary + task nav + mobile polish
- Strengthened `hydrateConditions` in OIP adapters to refresh rainfall/temperature/soil labels from **live weather when available**, and to label uncertainty when not.
- Species model enriched with educational habitat / look-alike / ethics fields (not fabricated forecasts).
- Season-table species switching now **reuses the map DOM** to avoid unnecessary pan/zoom resets.

### Performance & reliability
- JSON loads go through timeout-aware fetch with cache reuse.
- Platform fetch failures degrade gracefully (summary still renders with honest uncertainty).
- Faster soft-start timeout for location prompt (1.8s) so the shell is not stuck on skeletons.
- Map CSS: responsive SVG, `touch-action: none`, fewer fixed 420×300 assumptions.
- Clear error + Retry states (no endless spinners).

### Platform wiring
- Task nav synced in `wds-app-nav-config.js` and `nav-registry.json`.
- Smoke routes, sitemap, and inject-build-metadata updated for key new pages.
- Tests: `automation/test-foragecast-recovery.mjs`.

---

## Honest limitations (still before V1.0)

1. **Schematic maps only** — not georeferenced satellite/trail maps; observation overlays are architected, not implemented.
2. **Educational species index** — readiness scores are a local weighted model, not confirmed fruiting detections.
3. **Species coverage is small** — five supported species; no fabricated expansion (e.g. Chicken of the Woods was not added as sample data).
4. **Heavy platform script chain remains** — `wds-platform.js` still injects a large shared stack; bundle splitting is future work.
5. **Editorial home.json / Pike-centric copy** still exists for secondary content; summary path no longer depends on it for the primary answer.
6. **Journal is local-only** — no sync, export, or photo attachments yet.
7. **Pillar pages** (orchard/garden/etc.) remain available but are secondary to task nav.
8. **Provider fallback** — ForageCast boot still configures Open-Meteo with `fallback: false`; multi-provider failover is unfinished.

---

## Remaining technical debt

- Reduce duplicate `fetchPlatform` across pages (shared session package already helps, but pages still request independently).
- Further cut first-paint JS (defer WSKB/spotlight on overview).
- Replace residual fixed layout assumptions in older heat/prediction CSS.
- Add automated browser smoke for summary DOM (unit tests cover intelligence contracts today).
- Align classic `season-table.html` IA copy with recovery wording everywhere.

---

## Recommended next work (toward V1.0)

1. True map basemap + observation overlay schema (private-by-default).
2. Broader species library with WSKB links for every entry.
3. Multi-provider weather failover + clearer freshness badges in UI chrome.
4. Offline package for last-known conditions.
5. Property-aware summary weighting (already partly in Today actions).
6. Accessibility pass on task nav scroll and map controls.

---

## How to verify locally

```bash
cd .tmp-audit/waypoint-studio
node automation/test-foragecast-recovery.mjs
# serve site and open:
# /apps/foragecast/
# /apps/foragecast/conditions.html
# /apps/foragecast/species.html?id=chanterelles
# /apps/foragecast/timeline.html
# /apps/foragecast/map.html
```

---

## Assessment

**Before:** polished prototype / field-guide shell.  
**After Phase 1:** cohesive outdoor planning application shell with summary-first intelligence, task IA, interpreted conditions, and honest uncertainty.

**Not yet V1.0** — map depth, species breadth, and provider resilience still gate a true “use before every trip” product — but the product now feels like an application rather than a dataset showcase.
