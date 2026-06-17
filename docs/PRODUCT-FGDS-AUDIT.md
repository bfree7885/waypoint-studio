# Waypoint Studio — Product FGDS Inheritance Audit

**Purpose:** How each product inherits the Field Guide Design System (FGDS), shared homepage components, and content library — without per-app duplication.

**Implementation:** `design-system/ecosystem/product-registry.json` + `design-system/js/wds-ecosystem.js`

**Standard:** [`FIELD-GUIDE-STANDARDS.md`](FIELD-GUIDE-STANDARDS.md)

---

## Inheritance model

Every product receives:

| Layer | Source | How |
|-------|--------|-----|
| CSS (FGDS + homepage + WEF) | `design-system/css/wds.css` | Single `<link>` |
| Product theme | `data-product` on `<html>` | Set from registry |
| Homepage sections | `WDS.ecosystem.initProductHome()` | Registry `homepageSections` |
| Content cards | `design-system/content/*.json` | Filtered by `contentDomains` |
| Field guide pages | `design-system/field-guide/templates/` | Registry `fieldGuideTemplates` |
| Citizen science | Shared `citizen-science` section | Constitution copy; opt-in only |

**Thin product shell** (7 placeholder apps + future products):

```html
<div id="wds-product-home" data-wds-product="foragecast"></div>
<script src="../../design-system/js/wds.js" defer></script>
<!-- WDS.ecosystem.initProductHome({ product: 'foragecast', base: '../../design-system/' }) -->
```

Template: [`design-system/ecosystem/product-home-shell.html`](../design-system/ecosystem/product-home-shell.html)

---

## Product audit

### Waypoint Studio (ecosystem root)

| Area | Inherits |
|------|----------|
| **Homepage sections** | All: Featured Photograph, Today's Lesson, Seasonal Highlight, Field Guide Spotlight, Recent News, Featured Video, Outdoor Challenge, Explore Nearby, Latest Research, Featured Tool, Experiences (static HTML today), Citizen Science |
| **Educational templates** | All 11 FGDS templates |
| **Photography layout** | `gallery-grid` — multi-photo evidence grid |
| **News** | `news.json` — all domains |
| **Videos** | `videos.json` — curated, no autoplay placeholders |
| **Field investigations** | `field-investigation.html` + WEF lessons |
| **Outdoor challenges** | `challenges.json` + `outdoor-challenge.html` |
| **Citizen science** | Full privacy block; optional anonymous contribution |

**Status:** Root `index.html` is hand-authored today. Registry slug: `studio`. Migrate to `WDS.ecosystem` when ready.

---

### Waypoint Scenes (`scenes`)

| Area | Inherits |
|------|----------|
| **Homepage sections** | Featured Photograph, Today's Lesson, Field Guide Spotlight, Featured Video, Outdoor Challenge, Citizen Science |
| **Educational templates** | Photography, Weather, Habitat, Species, Field Investigation, Outdoor Challenge |
| **Photography layout** | `darkroom-featured` — Collections gallery via `WDS.gallery`; FGDS hero slots for editorial |
| **News** | Filtered: photography, weather, habitat, conservation |
| **Videos** | Field instruction companions to WEF lessons |
| **Field investigations** | WEF `fieldObservations` + FGDS `field-investigation.html` |
| **Outdoor challenges** | Repeat photography; links to shared challenge template |
| **Citizen science** | Opt-in phenology; private by default |

**Status:** Full workspace app (`apps/waypoint-scenes/`). Inherits CSS/JS via `../../design-system/`. Domain UI stays app-local; editorial pages use FGDS templates.

---

### ForageCast (`foragecast`)

| Area | Inherits |
|------|----------|
| **Homepage sections** | Featured Photograph, Today's Lesson, Seasonal Highlight, Field Guide Spotlight, Recent News, Outdoor Challenge, Citizen Science |
| **Educational templates** | Species, Habitat, Ecosystem, Outdoor Challenge, Seasonal Journal, Field Investigation |
| **Photography layout** | `species-plate` — plate + habitat evidence |
| **News** | Seasonal foraging bulletins, phenology |
| **Videos** | Species ID, ethical harvest context |
| **Field investigations** | Season table walks, habitat comparison |
| **Outdoor challenges** | Weekly species observation (no harvest required) |
| **Citizen science** | Optional phenology / species timing; location obscured |

**Status:** ✅ Shared shell via `WDS.ecosystem`

---

### Fieldry (`fieldry`)

| Area | Inherits |
|------|----------|
| **Homepage sections** | Featured Photograph, Today's Lesson, Seasonal Highlight, Recent News, Outdoor Challenge, Latest Research, Citizen Science |
| **Educational templates** | Seasonal Journal, Field Investigation, Equipment, Photography, Research Brief |
| **Photography layout** | `journal-evidence` — notebook + photo metadata |
| **News** | Field writing prompts, seasonal reflection |
| **Videos** | Notebook protocol, sketching |
| **Field investigations** | Daily three-line journal investigations |
| **Outdoor challenges** | Private journal weeks; no sharing required |
| **Citizen science** | Disabled by default sharing; notes stay private unless user opts in |

**Status:** ✅ Shared shell via `WDS.ecosystem`

---

### Shed Hunting (`shed-hunting`)

| Area | Inherits |
|------|----------|
| **Homepage sections** | Featured Photograph, Today's Lesson, Field Guide Spotlight, Recent News, Outdoor Challenge, Explore Nearby, Citizen Science |
| **Educational templates** | Species, Habitat, Geology, Field Investigation, Outdoor Challenge, Equipment |
| **Photography layout** | `sign-evidence` — sign, track, slope documentation |
| **News** | Wildlife activity, seasonal movement |
| **Videos** | Sign reading, ethics |
| **Field investigations** | Sign transects, empty-day honor |
| **Outdoor challenges** | Mileage + observation (no trophy framing) |
| **Citizen science** | Optional wildlife observation networks; anonymous |

**Status:** ✅ Shared shell via `WDS.ecosystem`

---

### Steepleaf (`steepleaf`)

| Area | Inherits |
|------|----------|
| **Homepage sections** | Featured Photograph, Today's Lesson, Seasonal Highlight, Field Guide Spotlight, Recent News, Featured Video, Outdoor Challenge, Citizen Science |
| **Educational templates** | Species, Habitat, Ecosystem, Seasonal Journal, Field Investigation, Research Brief |
| **Photography layout** | `species-plate` — botanical plates + habitat |
| **News** | Bloom timing, conservation alerts |
| **Videos** | Plant ID, hand lens use |
| **Field investigations** | Phenology plots, rare plant ethics |
| **Outdoor challenges** | Same-tree four sides; bloom surveys |
| **Citizen science** | Optional phenology; never collect rare species |

**Status:** ✅ Shared shell via `WDS.ecosystem`

---

### Savant Sommelier (`savant-sommelier`)

| Area | Inherits |
|------|----------|
| **Homepage sections** | Featured Photograph, Today's Lesson, Seasonal Highlight, Latest Research, Featured Video, Field Guide Spotlight, Citizen Science |
| **Educational templates** | Ecosystem, Geology, Weather, Habitat, Research Brief, Photography |
| **Photography layout** | `terroir-landscape` — slope, aspect, valley context |
| **News** | Vintage climate, regional ecology |
| **Videos** | Terroir as field science |
| **Field investigations** | Landscape tasting walks (observe before sip) |
| **Outdoor challenges** | Aspect/soil observation at vineyard margins |
| **Citizen science** | Optional climate/phenology; no personal identity |

**Status:** ✅ Shared shell via `WDS.ecosystem`

---

### SignalTerrain (`signalterrain`)

| Area | Inherits |
|------|----------|
| **Homepage sections** | Featured Photograph, Today's Lesson, Field Guide Spotlight, Recent News, Featured Video, Explore Nearby, Outdoor Challenge, Citizen Science |
| **Educational templates** | Geology, Weather, Equipment, Habitat, Field Investigation, Research Brief |
| **Photography layout** | `map-horizon` — horizon, contour, sky evidence |
| **News** | Weather windows, visibility |
| **Videos** | Map reading, compass walks |
| **Field investigations** | Navigation labs, terrain prediction |
| **Outdoor challenges** | Compass-only walks; map contour sketches |
| **Citizen science** | Optional weather/visibility obs; coords rounded |

**Status:** ✅ Shared shell via `WDS.ecosystem`

---

### Terrainbound (`terrainbound`)

| Area | Inherits |
|------|----------|
| **Homepage sections** | Featured Photograph, Today's Lesson, Seasonal Highlight, Outdoor Challenge, Recent News, Latest Research, Featured Tool, Citizen Science |
| **Educational templates** | Weather, Geology, Equipment, Outdoor Challenge, Seasonal Journal, Field Investigation |
| **Photography layout** | `trail-evidence` — route, weather, turnaround documentation |
| **News** | Storm windows, trail conditions |
| **Videos** | Turnaround ethics, weather reading |
| **Field investigations** | Route journals; humility documentation |
| **Outdoor challenges** | Turn-back drills; weather window planning |
| **Citizen science** | Optional trail condition reports; anonymous |

**Status:** ✅ Shared shell via `WDS.ecosystem`

---

## Shared vs. product-specific

| Shared (do not duplicate) | Product-specific (allowed) |
|---------------------------|----------------------------|
| FGDS CSS + templates | Workshop tools (Scenes effects, maps, journals) |
| Homepage section HTML via `WDS.ecosystem` | Domain algorithms and data models |
| Content library JSON | Product curriculum overrides |
| Citizen science language | Tool wiring to evidence |
| Photography placeholder layouts | Export formats, presets |
| WEF lesson schema | Parallax, foraging calendars, etc. |

---

## Adding a new product

1. Add entry to `design-system/ecosystem/product-registry.json`
2. Copy `design-system/ecosystem/product-home-shell.html` → `apps/new-product/index.html`
3. Replace `PRODUCT_SLUG`, `PRODUCT_NAME`, `PRODUCT_DESCRIPTION`
4. Set `data-product` accent slug
5. Link `design-system/css/wds.css` + `wds.js`
6. Call `WDS.ecosystem.initProductHome({ product: 'new-product' })`

No new CSS or homepage markup required unless a genuinely new section type is added to FGDS (rare).

---

## Files

| Path | Role |
|------|------|
| `docs/PRODUCT-FGDS-AUDIT.md` | This audit |
| `design-system/ecosystem/product-registry.json` | Per-product inheritance config |
| `design-system/js/wds-ecosystem.js` | Shared renderer |
| `design-system/ecosystem/product-home-shell.html` | Thin HTML shell |
| `design-system/field-guide/templates/` | FGDS page templates |
| `design-system/content/` | Shared placeholder library |
