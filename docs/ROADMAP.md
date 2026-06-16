# Waypoint Studio — Unified Roadmap

**Last updated:** Strategy session  
**Principle:** Every project moves 5% closer to MVP each cycle. Shared systems first. No novelty for its own sake.

---

## Ecosystem maturity (weighted)

| Layer | Maturity | Hours to foundation-complete |
|-------|----------|------------------------------|
| WDS (design system) | 85% | 16h polish + CSS consolidation |
| WEF (education framework) | 80% | 12h canonical content per product |
| Shared JS (tabs, upload, gallery, species, nav, icons) | 75% | 8h adoption in Scenes |
| Waypoint Scenes (runnable app) | 78% | 40h to confident v0.1.0 |
| Other 7 products | 8% (concept) | 24–40h each to MVP shell |

---

## Phase 0 — Now → 2 weeks (platform)

| # | Work | Benefits | Hours |
|---|------|----------|-------|
| 1 | Adopt WDS.tabs + WDS.upload in Scenes | All tabbed products | 4h |
| 2 | Consolidate `main.css` + `studio-shell.css` into WDS + thin `scenes.css` | All products | 12h |
| 3 | Wire real images to Collections | Scenes credibility | 6h |
| 4 | Mobile tab bar + QA pass | Scenes launch | 8h |
| 5 | Ship `product-shell.html` per new product | 7 products | 3h each |
| 6 | One canonical WEF track per product (skeleton) | All products | 4h each |

---

## Phase 1 — Weeks 3–6 (first launches)

**Order by ROI × readiness:**

1. **Waypoint Scenes** v0.1.0 — public MVP
2. **ForageCast** — species + season MVP (map + species template + learn)
3. **Steepleaf** — species/habitat MVP (reuse species + gallery)
4. **Fieldry** — field journal MVP (forms + learn + export)

---

## Phase 2 — Weeks 7–12

5. **Shed Hunting** — log + map + wildlife learn  
6. **SignalTerrain** — map + navigation learn  
7. **Terrainbound** — routes + conservation learn  

---

## Phase 3 — Weeks 13–16

8. **Savant Sommelier** — wine profiles + tasting learn  
9. **Waypoint Studio** hub — product picker, shared account (optional), ecosystem landing  

---

## Per-product MVP definitions

### Waypoint Studio (platform)
**MVP:** Ecosystem landing page linking 8 products; shared `design-system/` documented; WDS reference gallery; no login required.  
**Not yet:** Unified auth, billing, cross-product sync.

### Waypoint Scenes
**MVP:** Upload → Living Scene / Parallax → Collections browse → Field Guide → PNG export. Local-only.  
**Not yet:** Video export, AI depth, scene intelligence.

### ForageCast
**MVP:** Season calendar + 10 species profiles (WEF) + map pin + search.  
**Not yet:** ML identification, community, alerts.

### Shed Hunting
**MVP:** Find log + map + 5 wildlife/geology lessons + photo gallery.  
**Not yet:** Social, leaderboards, e-commerce.

### Fieldry
**MVP:** Field notes form + gear list + export + 5 field-skills lessons.  
**Not yet:** Cloud sync, collaboration.

### Steepleaf
**MVP:** Species browser (20 entries) + habitat filters + learn tracks.  
**Not yet:** AI ID, citizen science integration.

### Savant Sommelier
**MVP:** Wine profile cards + tasting notes + 5 wine/ecology lessons.  
**Not yet:** Cellar management, pairing AI.

### SignalTerrain
**MVP:** Map + coords + geology/weather/navigation learn + offline tiles stub.  
**Not yet:** Live telemetry, SAR features.

### Terrainbound
**MVP:** Route log + terrain gallery + conservation/navigation learn.  
**Not yet:** Wearable sync, race timing.

---

## Shared systems map

```
design-system/
├── css/wds.css          → typography, color, components (ALL)
├── css/wds-education.css → lesson template (ALL)
├── js/wds-tabs.js       → workspace navigation (ALL)
├── js/wds-upload.js     → media ingest (Scenes, Fieldry, Shed)
├── js/wds-gallery.js    → collections (Scenes, Steepleaf, Shed)
├── js/wds-species.js    → profiles (ForageCast, Steepleaf, Sommelier)
├── js/wds-nav.js        → shell (ALL)
├── js/wds-icons.js      → iconography (ALL)
└── education/           → WEF engine (ALL — Learn required)
```

---

## Tomorrow's priorities

1. Verify Scenes tabs work via `WDS.tabs` wrapper  
2. Smoke-test Field Guide WEF render  
3. Add 3 real photos to `assets/Images/` + wire `photography-data.js`  
4. Copy `product-shell.html` → start ForageCast scaffold (optional separate repo)

## This week's priorities

1. CSS consolidation plan (delete duplicate chrome from `main.css`)  
2. Scenes mobile tab overflow + safe-area  
3. Canonical WEF migration for 2 Scenes lessons (pilot)  
4. ForageCast `data-product="foragecast"` shell with empty curriculum  
5. Cross-browser QA checklist execution  

## Remaining MVP blockers (Scenes)

| Blocker | Owner | Hours |
|---------|-------|-------|
| Real portfolio assets | Content | 4h |
| Mobile nav / 5-tab overflow | Frontend | 6h |
| CSS triple-stack | Frontend | 12h |
| iOS tilt + Safari QA | QA | 4h |
| Video export | Defer post-v0.1.0 | — |

## Suggested Git commits

1. `feat(design-system): add gallery, species, nav, icons shared modules`  
2. `refactor(scenes): delegate tabs and utils to WDS`  
3. `docs: add Waypoint Studio unified roadmap and strategy`  
4. `feat(design-system): add product-shell template for new products`  
5. `chore: wire wds-tabs and wds-upload in Scenes index`  

## Release readiness

| Product | Readiness | Ship when |
|---------|-----------|-----------|
| Waypoint Studio (platform) | 40% | Phase 3 hub |
| Waypoint Scenes | **78%** | 40h → v0.1.0 |
| ForageCast | 10% | Shell + 1 track |
| Shed Hunting | 8% | Shell + 1 track |
| Fieldry | 8% | Shell + 1 track |
| Steepleaf | 8% | Shell + species stub |
| Savant Sommelier | 6% | Shell + 1 track |
| SignalTerrain | 6% | Shell + map chrome |
| Terrainbound | 6% | Shell + 1 track |

---

*Every product includes Learn. Every product uses WDS. No product forks the button.*
