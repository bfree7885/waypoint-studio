# Deprecated Render Paths — Phase 1 Documentation

**Status:** Documented (not removed)  
**Purpose:** Clarify what the homepage hot path uses vs legacy code still loaded by `wds.js` but not invoked on first open.

Removing these paths from the loader is **Phase 1 performance work (R2–R4)** — see `PERFORMANCE_BASELINE.md`. Do not delete without a lazy-load plan.

---

## Homepage hot path (active)

| Step | Module | Role |
|------|--------|------|
| 1 | `js/home-boot.js` | Location bootstrap → `WDS.contentEngine.init` |
| 2 | `design-system/js/wds-content-engine.js` | `SECTION_ORDER = ["outdoor-dashboard"]` only |
| 3 | `renderOutdoorDashboard` | Morning dashboard shell (brief, vitals, widget grid) |
| 4 | `WDS.dashboardEngine` | Widget mount, customize, educational fallbacks |
| 5 | `WDS.outdoorIntelligence` (OIP) | Regional intelligence + weather hints |

Default homepage does **not** call `renderHomeHero`, `renderThisWeekOutdoors`, or multi-section FGDS home layouts.

---

## Legacy content-engine renderers (deprecated on homepage)

Defined in `wds-content-engine.js` → `RENDERERS` but **not** in `SECTION_ORDER`:

| Renderer ID | Function | Former use |
|-------------|----------|------------|
| `home-hero` | `renderHomeHero` | Full-bleed hero + stacked home sections |
| `this-week-outdoors` | `renderThisWeekOutdoors` | Editorial week card above dashboard |
| `weekend-investigation` | `renderWeekendInvestigation` | Weekend field lab block |
| `foragecast` | `renderForagecast` | Inline ForageCast promo on home |
| `regional-field-notes` | `renderRegionalFieldNotes` | Notes carousel |
| `seasonal-watch` | `renderSeasonalWatch` | Seasonal watch list |
| `species-spotlight` | `renderSpeciesSpotlight` | WSKB spotlight |
| `research-brief` | `renderResearchBrief` | Research brief card |
| `featured-video` | `renderFeaturedVideo` | Video feature |
| `photo-essay` | `renderPhotoEssay` | Photo essay |
| `conservation-update` | `renderConservationUpdate` | Standalone conservation (now in dashboard section) |
| `experiences` | `renderExperiences` | Product instrument grid |
| `platform-mission` | `renderPlatformMission` | Mission copy block |

**Re-enable only** by passing a custom `sections` array to `WDS.contentEngine.init` — not used by `home-boot.js` today.

`renderCitizenScience` and `renderHowWaypointWorks` append when `includeCitizenScience` / `includeMethodology` are true. Homepage sets `includeCitizenScience: false`, `includeMethodology: true` (methodology footer only).

---

## Legacy dashboard mount fallback

`mountDashboardWidgets` in `wds-content-engine.js`:

- **Primary:** `WDS.dashboardEngine.mountWidgets` (current)
- **Fallback:** `mountWeatherWidgets` + `mountHappeningNow` if `dashboardEngine` missing

The fallback path is deprecated; all supported builds include `dashboardEngine`. Do not add features to the fallback branch.

---

## `WDS.ecosystem` (product home renderer)

| File | `design-system/js/wds-ecosystem.js` |
| Status | Loaded via `wds.js` (~21 KB) but **not called** from `index.html` |
| Used by | ForageCast / Fieldry / Scenes product home pages via `initProductHome` |
| Action | Candidate for lazy-load when leaving homepage (PERFORMANCE_BASELINE R3) |

---

## Other loader weight (not homepage hot path)

These modules are in the initial `wds.js` array but are not required for first dashboard paint:

| Module | Notes |
|--------|-------|
| `wds-app-preview.js` | App preview cards; not used on dashboard |
| `wds-education-factory.js`, `wds-education-topic.js` | Education flows; not dashboard boot |
| `wds-species-spotlight.js` | Species spotlight; not in `SECTION_ORDER` |
| `wds-gallery.js`, `wds-upload.js` | Fieldry/media flows |
| Domain dashboard intel modules | Needed when widgets mount; deferrable after shell paint (R2) |

---

## Risky changes — document, do not rush

| Change | Risk | Recommendation |
|--------|------|----------------|
| Remove renderers from `RENDERERS` | Breaks apps passing custom `sections` | Keep until product homes migrate |
| Split `wds.js` loader | Order-dependent init; hard to test | Follow PERFORMANCE_BASELINE phased plan |
| Delete `wds-dashboard.js` | `applyToBundle` still used in content engine | Audit callers first |
| Remove `wds-ecosystem.js` from loader | Breaks ForageCast/Fieldry home if user navigates directly | Lazy-load on product routes only |

---

## Verification

After any loader change, run `docs/HOMEPAGE_SMOKE_TEST.md` and confirm ForageCast + Fieldry entry pages still load.
