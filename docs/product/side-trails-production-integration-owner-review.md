# Owner Review — Side Trails production integration

**Date:** 2026-08-06  
**Branch:** `feature/side-trails-production-integration`  
**Base:** `origin/main` (`52c4656`)  
**Product:** Waypoint Studio · Side Trails  
**Deployed:** No  
**Merged:** No — push feature branch only; owner merge gate

---

## Verdict

**Approve** integrating Side Trails as a simple production laboratory landing
with **Civic Trails** and **SignalTerrain** only.

No Waypoint Studio redesign. No changes to apps under `apps/signalterrain/`
(or other application trees beyond light discovery links already used elsewhere).

---

## What shipped

| Item | Detail |
| --- | --- |
| Route | `/side-trails/` |
| Card set | Civic Trails + SignalTerrain only |
| Card fields | Icon, title, tagline, description, status badge, Open |
| Civic Trails Open | `https://github.com/bfree7885/civic-trails` |
| SignalTerrain Open | `/side-trails/signalterrain/` product landing |
| Catalog | `data/side-trails/catalog.json` (minimal two-project subset) |
| Styles | Existing WDS (`wcs-page`, `was-home__card`, `wds-side-trails.css`) |
| Discovery | About · Support · 404 · Incubator (light links only) |
| Docs | `docs/side-trails/README.md` |
| Smoke | `automation/test-side-trails.mjs` |

### Product intent (honored)

Side Trails is the permanent home for experimental projects, research,
prototypes, intelligence tools, and special-interest applications — a natural
extension of Waypoint Studio, not a competing Home flagship surface.

---

## Intentionally left out

1. **Global Signals** and other candidates — not in the primary production cards.
2. **Search, categories UI, filters, dashboards** on the Side Trails page.
3. **Studio redesign** and application feature work under `apps/`.
4. **Primary nav chrome** expansion (optional later; quiet discovery is enough).
5. **Merge to main** — branch pushed for review only.

---

## Honesty notes

- Catalog empty/unavailable states stay honest; projects are not invented in JS.
- SignalTerrain Open targets the public product landing, not a claim that the
  app was rebuilt in this block.
- Civic Trails Open is GitHub until a hosted product URL is confirmed.

---

## Tests

```bash
node automation/test-side-trails.mjs
node automation/test-signalterrain-landing.mjs
```

---

## Risks / remaining

1. Confirm Civic Trails hosted URL when available; GitHub is an honest interim.
2. When adding a third Side Trail later, keep the landing simple — resist
   search/filter creep unless product asks for it.
3. Global Signals (and similar) should join only via an explicit catalog decision.

---

## Recommendation

**Approve for merge when ready.** Do not merge until owner confirms the
two-project production set and Open destinations.
