# Savant Sommelier Product Recovery — Phase 1 Report

**Date:** 2026-07-18  
**Scope:** Rebuild Savant from a foundation stub into a wine intelligence platform with five primary experiences.  
**Repo:** `waypoint-studio` (`apps/savant-sommelier/`)  
**Commit status:** Not committed / not pushed (per owner instruction).

---

## Mission outcome

Savant Sommelier now presents as a serious product that helps people:

1. **Discover** wine (with why / flavors / uniqueness / similar / price context)
2. **Learn** wine (curriculum with overview, visual aids, facts, misconceptions, related learning)
3. **Track** wine (local cellar — empty until the user adds bottles)
4. **Buy** wine later (architecture only — no fake marketplace)
5. **Grow / site** wine (**Vineyard Intelligence** flagship — property metrics + Future Vineyard horizons with explanations)

It is explicitly **not** Vivino, CellarTracker, Wine Searcher, or Delectable.

---

## Application organization

| Experience | Route | Role |
|------------|-------|------|
| Discover | `index.html` | Faceted educational exploration |
| Learn | `learn.html` | Interactive curriculum |
| My Cellar | `cellar.html` | Inventory, wishlist, notes |
| Vineyard Intelligence | `vineyard.html` | Map click → analysis → future grapes |
| Settings | `settings.html` | Units, privacy, clear local data |

Task navigation is shared across pages and mirrored in platform nav config / registry.

---

## What was removed / replaced

- Foundation-only homepage that felt unfinished
- Placeholder “modules planned” as the primary experience
- Sample/fake cellar inventory (never planted)
- Duplicate “overview-only” nav dead-end
- Unfinished marketplace UI (replaced with honest buying contract)

---

## Flagship: Vineyard Intelligence

- **Property analysis** covers elevation, slope, aspect, terrain, drainage, solar exposure, GDD, hardiness, climate class, rainfall, humidity, heat/cold, frost, wind, disease, water, season length — each with **why it matters**.
- **Future Vineyard** horizons: Today, 5, 10, 15, 20, 25 years.
- Recommendations include confidence, climate suitability, quality expectation, heat stress, disease, freeze risk, water demand, challenges, expected changes, and a full **why** paragraph (never a bare percentage alone).
- Honesty labels: educational estimates / scenario warming heuristic — not surveyed DEM or certified climate downscaling.

---

## Design language

- Quiet GIS × product UI: stone greens, Cormorant display + Source Sans body
- No wine clip art, cork textures, or decorative gimmicks
- Shared Waypoint shell + task-nav pattern aligned with ForageCast recovery

---

## Honest V1 readiness

**Not Version 1.0 yet.** Phase 1 makes Savant *feel like a product* and establishes architecture. Remaining gaps (live climate layers, georeferenced maps, retailer adapters, richer catalogs) are documented in the Technical Debt and Future Vineyard Engine Roadmap reports.

**Assessment:** Strong foundation for internal review and continued build — **pre-V1 / recovery** status.
