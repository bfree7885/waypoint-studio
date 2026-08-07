# Owner Review — Move SignalTerrain into Side Trails (IA)

**Date:** 2026-08-06  
**Branch:** `feature/signalterrain-move-to-side-trails`  
**Base:** `feature/studio-nav-architecture-alignment` (`aa408fa`)  
**Product:** Waypoint Studio · Side Trails · SignalTerrain  
**Deployed:** No  
**Merged:** No

---

## Verdict

**Approve moving SignalTerrain under Side Trails in studio information architecture.**

Hierarchy:

**Waypoint Studio → Side Trails → SignalTerrain**

No SignalTerrain app behavior was changed. Existing content and routes were preserved.

---

## What shipped

| Item | Detail |
| --- | --- |
| Catalog | SignalTerrain remains in `data/side-trails/catalog.json` |
| Nav config | Removed from `homeIncubator`; added `homeSideTrails: ["signalterrain"]` |
| Nav registry / app entry | `family: "side-trails"`, status Experimental; app route unchanged |
| Platform catalog | `tier: "side-trails"`, `parent: "side-trails"` |
| Product registry | Moved from `portfolio.foundations` → `portfolio.sideTrails` |
| Studio home | Side Trails section; Incubator no longer lists SignalTerrain |
| Incubator | SignalTerrain section replaced with pointer to Side Trails |
| About / Support | Hierarchy and Side Trails listing clarified |
| Docs | Platform architecture, ST vision/platform, rebuild IA, Side Trails README |
| Sitemap | `/side-trails/` and `/side-trails/signalterrain/` added; app URL kept |
| Smoke test | `automation/test-signalterrain-side-trails-move.mjs` |

### URLs preserved

| URL | Role |
| --- | --- |
| `/apps/signalterrain/` | Existing app (unchanged) |
| `/side-trails/signalterrain/` | Product landing (unchanged) |
| `/side-trails/` | Side Trails catalog |

Dual entry preferred over redirects that would break bookmarks.

---

## Honesty notes

- SignalTerrain is **not** a primary peer of Dashboard / Scenes / Sheds.
- SignalTerrain is **not** an Incubator peer of Steepleaf / Savant.
- Maturity remains Experimental on Side Trails.
- App functionality, data, and cyber surfaces were not redesigned in this block.

---

## Tests

```bash
node automation/test-signalterrain-side-trails-move.mjs
node automation/test-side-trails.mjs
```

---

## Risks / remaining

1. Historical rebuild reports still mention SignalTerrain as a former incubator listing — left as historical record.
2. Optional later: soft banner on `/apps/signalterrain/` linking to the Side Trails product page (not in this block).
3. Contact category list still includes SignalTerrain (appropriate for support routing).

---

## Recommendation

**Approve.** Do not merge until owner confirms IA hierarchy and dual-URL preservation.
