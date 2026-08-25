# Sheds Best-in-Class Field Intelligence Audit

**Product:** Waypoint Studio → Sheds  
**Audit date:** 2026-08-24  
**Base:** `main` @ `c470884609edfd649b1b880f659fa802958f182e` (includes PR #52 mobile field UX)  
**Standard:** [`SHEDS-ECOLOGY-STANDARD.md`](./SHEDS-ECOLOGY-STANDARD.md)  
**Roadmap:** [`SHEDS-ROADMAP-V3.md`](./SHEDS-ROADMAP-V3.md)  

**Accepted foundation (do not redesign):** map-first mobile chrome from PR #52 — Locate/Recenter/zoom cluster, Search|Note|Plan|More dock, compact session strip, Field Briefing sheet, More → Map & layers.

**Benchmark class:** mature outdoor mapping products (e.g. onX) for *field usability*, not feature cloning.  
**Differentiation:** purpose-built shed hunting + rigorous whitetail ecology + transparent environmental intelligence.

---

## 0. Executive verdict

Sheds today is a **strong local-first shed-hunting decision notebook** on a lean Leaflet shell, with unusually honest channel separation (Timing / Habitat MODEL / Searchability / Confidence / Observed) and a newly validated map-first phone chrome.

It is **not yet** a best-in-class field intelligence application: mapping depth, GPS/track tools, offline resilience, observation speed, search-history learning, and explainable ecology still lag mature outdoor apps — while its scientific honesty posture is already a competitive advantage if we protect and extend it.

| Dimension | Grade | Note |
| --- | --- | --- |
| Scientific honesty / channel separation | A− | Keep; close remaining language gaps |
| Mobile map-first field chrome | A− | Accepted post-PR #52 |
| Basemaps / terrain context | C | Street + topo only; no satellite |
| GPS / navigation toolkit | C+ | Locate/track solid; no compass/measure/offline tiles |
| Search lifecycle | B− | Start→track→summary exists; history/learning thin |
| Observations | B | Rich types; field entry still form-heavy |
| Ecology intelligence depth | C+ | One GIS AOI pack; heuristics need provenance UI |
| Stewardship in-workflow | C | Ethics sheet exists; not decision-integrated |
| Offline resilience | D+ | Local data yes; tiles/weather fail honestly but painfully |

---

## 1. Classification key

| Tag | Meaning |
| --- | --- |
| **KEEP** | Retain as-is; protect from regression |
| **IMPROVE** | Same concept; raise quality |
| **REBUILD** | Concept right; implementation insufficient |
| **ADD** | Missing capability worth building |
| **REMOVE** | Harmful / confusing / fake certainty |
| **RESEARCH REQUIRED** | Do not ship until evidence/data reviewed |

---

## 2. Mapping

| Finding | Class | Evidence | Notes |
| --- | --- | --- | --- |
| Street (CARTO) + Topo (Esri) basemaps | KEEP | `sheds-tile-provider.js` | Reliable providers; OSMF refused |
| Tile retry + status banner | KEEP | tile provider + `#map-tile-status` | Honesty when tiles fail |
| Leaflet layers control (desktop) / Map & layers (mobile) | KEEP | map HTML + PR #52 | Mobile path via More |
| Satellite / aerial basemap | ADD | absent | Highest onX-class mapping gap |
| Hybrid / opacity blend street↔sat | ADD | absent | Progressive disclosure under Map & layers |
| Contours / hillshade as controllable overlays | RESEARCH REQUIRED | topo tiles may show contours visually | Prefer explicit DEM-derived overlays later |
| Land cover / wetlands / hydro overlays | ADD (scoped) | GIS pack samples NLCD internally; not user layer | Start as AOI overlays with provenance |
| Trails/roads as product layers | IMPROVE | visible in basemap only | Optional overlay only if source clear |
| Property / parcel lines | RESEARCH REQUIRED | ethics mentions law; no parcels | Legal + licensing heavy; stewardship > novelty |
| Public land context (beyond PA SGL) | IMPROVE → ADD | `sheds-sgl-overlay.js` | Expand via PAD-US / state layers carefully |
| Heat opacity + mode switches | KEEP / IMPROVE | `#sheet-controls` | Improve MODELED labeling on legend |
| Marker legend YOU / SEARCH / INSPECT / OBS | KEEP | `#map-marker-legend` | Core trust UX |
| Permanent multi-row map chrome | REMOVE (already) | PR #52 | Do not reintroduce control towers |

---

## 3. Field navigation

| Finding | Class | Evidence | Notes |
| --- | --- | --- | --- |
| Locate + Recenter (explicit only) | KEEP | `sheds-map-app.js` | No surprise recenter |
| Accuracy circle + approx labeling | KEEP | GPS_APPROX_M 80 | Trust |
| Heading stub from GPS | IMPROVE | when available | Add compass / DeviceOrientation carefully |
| GPS denial memory + Permissions reconcile | KEEP | `waypoint-sheds-gps-denied-v1` | Honest offline-ish GPS |
| Session `watchPosition` track polyline | KEEP | session store | Foundation for tracks product |
| Live distance in session strip | IMPROVE | distance exists; strip shows time/notes | Field usability |
| Breadcrumbs / return-to-start | ADD | absent as first-class | Build on session path |
| Coordinates / elevation readout | ADD | elev used for model; weak HUD | Progressive disclosure on YOU chip |
| Distance / bearing / measure tools | ADD | planner text bearing only | Map & layers or long-press tool |
| Compass UI | ADD | no DeviceOrientation | Battery + permission cost |
| Offline basemap tiles | ADD (hard) | no SW/mbtiles | P1–P2 research |
| Battery-conscious GPS | IMPROVE | watch while searching | Adaptive interval / pause when sheet open |
| Analyze-at-YOU accuracy gate | KEEP | 500 m gate | Prevents fake SEARCH |

---

## 4. Search workflow lifecycle

```
PLAN → ENTER FIELD → START SEARCH → NAVIGATE → RECORD SIGN → RECORD SHED
    → COVER AREA → REVIEW SEARCH → LEARN FROM HISTORY → PLAN NEXT
```

| Stage | Current state | Class | Breaks |
| --- | --- | --- | --- |
| PLAN | Field Plan + briefing When/Where/Landscape/Today | IMPROVE | Explainability & provenance incomplete |
| ENTER FIELD | Locate / SEARCH prompt / ethics first-run | KEEP | Satellite context missing |
| START SEARCH | Dock Search + session strip | KEEP | — |
| NAVIGATE | Track + locate/zoom | IMPROVE | No measure/compass/return |
| RECORD SIGN / SHED | Add note sheet | IMPROVE | Too many taps; types exist but UX heavy |
| COVER AREA | Auto partial along track + manual marks | IMPROVE | Coverage UI not first-class |
| REVIEW SEARCH | Session summary sheet | IMPROVE | Weak map replay |
| LEARN FROM HISTORY | Text history dump | REBUILD | Cannot answer coverage/find/sign questions well |
| PLAN NEXT | Planner INSPECT + Field Plan | IMPROVE | Only inside GIS AOI / notes; explainability |

---

## 5. Observations

| Finding | Class | Notes |
| --- | --- | --- |
| Rich type taxonomy (shed, deer, sign, beds, pressure, etc.) | KEEP | `sheds-observation-store.js` |
| Local-only store + privacy flags | KEEP | Differentiator |
| GPS accuracy gating for honest precision | KEEP | — |
| Photo as `photoRef` string only | IMPROVE | Local photo attach without upload |
| Field entry form complexity | REBUILD (UX) | Keep schema; progressive quick-pick UI |
| Confidence / optional biology metadata | IMPROVE | Optional advanced; never required in field |
| Sign subtypes (tracks/scat/rub/scrape) | KEEP / IMPROVE | Faster chips |
| Missing quick types vs wishlist | ADD selectively | carcass, photo-first, water — only if field-speed |
| Cumbersome scientific form | REMOVE risk | Do not grow required fields |

---

## 6. Search history & learning

| Question hunter asks | Today | Class |
| --- | --- | --- |
| Where have I searched? | Partial coverage marks + sessions | IMPROVE |
| When / how long? | Session summary | KEEP |
| How far walked? | `distanceM` on session | IMPROVE (visibility) |
| Actual coverage footprint? | ~45 m cells | IMPROVE |
| What found / what sign? | Obs markers + filters | IMPROVE |
| Unsearched remainder? | Weak | ADD |
| Conditions differ across days? | Weather snapshots on obs | IMPROVE |
| Patterns across seasons? | Patterns helper thin | RESEARCH REQUIRED → ADD |

History sheet text dump → **REBUILD** into a trip browser that still stays local-first.

---

## 7. Intelligence / scoring audit

### 7.1 What exists (KEEP architecture)

| Channel | Module | Must remain |
| --- | --- | --- |
| Timing | `sheds-timing.js` | Coarse phases; not cast day |
| Habitat MODEL | `sheds-habitat.js` + `sheds-habitat-gis.js` | Empty outside evidence |
| Searchability | `sheds-searchability.js` + Today’s Search | Not cast trigger |
| Confidence | `sheds-confidence.js` | Guidance support ≠ find % |
| Observed | briefing + markers | Separate from MODEL |
| Biological factors | `sheds-biological-model.js` v2.0 | Evidence IDs; caps; honesty |

### 7.2 Per-score obligations (gaps)

| Score / UI | Inputs | Provenance UI today | Class |
| --- | --- | --- | --- |
| Heat bands | GIS structure/edge/slope and/or obs kernels | Partial legend | IMPROVE |
| Timing plainLabel | date + lat | Soft | IMPROVE (evidence class) |
| Searchability windows | weather + daylight | Calm copy | IMPROVE (missing snow depth) |
| Planner INSPECT | habitat cells + distance | Why lines exist | IMPROVE |
| Field Plan composer | multi-channel | Good skeleton | IMPROVE |
| Advanced weight sliders | user prefs | Expert-only (good) | KEEP demoted |
| Legacy / validate surfaces | Advanced | KEEP demoted | Do not promote |

### 7.3 Scientific weaknesses

| Weakness | Class |
| --- | --- |
| Single GIS pack AOI (`pa-pike-milford-v1`) | IMPROVE / ADD packs |
| Aspect heuristic vs documented regional disagreement | KEEP caveat / IMPROVE UI disclosure |
| Snow water-eq ≠ depth honesty exists but easy to miss | IMPROVE |
| Funnel/corridor language may read as fact | IMPROVE → Ecology Standard |
| Prior-find interest can still feel like hotspot | IMPROVE labeling + cap visibility |
| No stewardship caution when MODEL implies winter concentration | ADD |
| Wide-area “intelligence” without data | REMOVE temptation | Empty > fake |

---

## 8. Ethics, privacy, offline

| Finding | Class |
| --- | --- |
| Ethics sheet (privacy, law, wildlife, habitat, honesty) | KEEP |
| Local-first stores; export JSON | KEEP |
| Offline banner honesty | KEEP |
| Forced offline scoring checkbox | KEEP (Advanced) |
| Stewardship inside Field Briefing decisions | ADD |
| Jurisdiction shed-collection rules | RESEARCH REQUIRED |
| Offline tile packs | ADD (hard) |
| Cloud sync | RESEARCH REQUIRED | Default remains local |

---

## 9. Mobile UX (accepted)

| Finding | Class |
| --- | --- |
| Map-first chrome PR #52 | KEEP |
| Dock Search \| Note \| Plan \| More | KEEP |
| Session strip + End Search | KEEP |
| Field Briefing sheet | KEEP / IMPROVE content only |
| More → Map & layers discoverability | KEEP |
| Desktop left briefing + right rail | KEEP |
| Desktop `prompt×here` stacking | IMPROVE (deferred separately) |
| Permanent floating feature chrome | REMOVE (policy) |

**UX principle:** progressive disclosure. Map stays dominant. Ecology detail lives in sheets.

---

## 10. Gaps vs mature outdoor mapping apps

Largest practical gaps (not clone checklist):

1. **Satellite / hybrid context** while walking  
2. **Offline map resilience**  
3. **Measure / compass / return tools**  
4. **Track library** (replay, export GPX, elevation profile)  
5. **Public land / access layers** beyond one SGL source  
6. **Property awareness** (careful, legal)  
7. **Field-speed observation capture**  
8. **Trip history that teaches**  
9. **Multi-region habitat data**  
10. **In-workflow stewardship**

Sheds should close these **through a shed-hunting lens**, not by mirroring onX feature matrices.

---

## 11. Strongest existing Sheds advantages

1. Honest **YOU ≠ SEARCH ≠ INSPECT ≠ OBS** location model  
2. Separated **Timing / Habitat / Searchability / Confidence** channels  
3. Explicit **no find probability** product stance  
4. Local-first privacy + ethics framing  
5. Evidence-linked biological model catalog (`EVIDENCE`)  
6. Field Plan / briefing hierarchy (Phase 4)  
7. Accepted **map-first phone chrome** (PR #52)  
8. Coverage + session tracking seeds a real search notebook  
9. Empty states preferred over decorative certainty  
10. Purpose focus: shed season + walk guidance — not everything outdoors

---

## 12. Proposed architecture (V3)

```
┌──────────────────────────── Map canvas (dominant) ────────────────────────────┐
│ Basemaps: Street | Topo | Satellite | (optional Hybrid)                        │
│ Overlays: Habitat MODEL* | Observed | Coverage | Access/Stewardship*           │
│ Markers: YOU | SEARCH | INSPECT | OBS                                          │
└────────────────────────────────────────────────────────────────────────────────┘
         │ progressive disclosure
┌────────┴────────┬───────────────┬────────────────┬─────────────────────────────┐
│ Field chrome    │ Briefing      │ More tools     │ Advanced (demoted)           │
│ Locate/Zoom     │ When/Where/   │ Map & layers   │ Weights / Validate           │
│ Dock actions    │ Landscape*/   │ History        │ Diagnostics                  │
│ Session strip   │ Today/Obs/    │ Ethics+Steward │                              │
│                 │ Next+Why*     │ Export         │                              │
└─────────────────┴───────────────┴────────────────┴─────────────────────────────┘

* Always labeled Observed | Derived | Modeled | Unknown
```

**Data planes**

| Plane | Storage | Network |
| --- | --- | --- |
| Notebook | localStorage → future IndexedDB | none required |
| Sessions/tracks | local | none |
| GIS packs | bundled + cache | optional refresh |
| Weather/elev | cache by bounds | Open-Meteo class |
| Basemap tiles | browser cache; later offline packs | tile hosts |
| Access layers | cache | PASDA / PAD-US class |

**Intelligence planes** — keep channel separation; add Stewardship plane; enforce Ecology Standard on every output.

---

## 13. Capability proposals (summary table)

For full priority scoring see Roadmap. Highlights:

| Capability | User value | Eco value | Data | Difficulty | Offline | Confidence limits | UI home | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Evidence-class labeling | Trust | Critical | none | Low | n/a | Forces honesty | Briefing + legend | P0 |
| Language scrub primary surfaces | Trust | Critical | none | Low | n/a | Reduces false certainty | Briefing/heat/coach | P0 |
| Stewardship cautions in briefing | Safety | High | rules/heuristic | Low–Med | local copy | Jurisdictional Unknown | Briefing / ethics | P0 |
| Satellite basemap | Orientation | Medium | Esri imagery | Low | same as tiles | Imagery ≠ habitat truth | Map & layers | P1 |
| Live distance on session strip | Field UX | Low | GPS track | Low | local | GPS error | Session strip | P1 |
| Quick-pick observation entry | Speed | High (more data) | existing schema | Med | local | User confidence | Note sheet | P1 |
| Measure / bearing tool | Navigation | Low | map math | Med | local | User skill | Map tool | P1 |
| Trip history browser | Learning | High | sessions/obs | Med | local | Incomplete coverage | History | P1 |
| Explainable Why card | Trust | High | model outputs | Med | local | Missing inputs listed | Briefing / INSPECT | P2 |
| Additional GIS packs | Where | High | NLCD/DEM | High | pack cache | AOI-bound | Habitat MODEL | P2 |
| Snow-depth product | Searchability | High | SNODAS-class | High | poor | Resolution limits | Today | P2–P3 |
| Offline tile packs | Resilience | Medium | mbtiles/SW | High | yes | Stale tiles | Map & layers | P2 |
| PAD-US / multi-state access | Access | Medium | public land | High | cache | Vintage | Overlay | P3 |
| Morphometric funnel layer | Where | Med–Research | DEM | High | pack | Heuristic | MODEL overlay | P3 |
| Photo-first obs capture | Evidence | High | device photos | Med | local files | Privacy | Note | P3 |
| GPX export / track library | Interop | Low | sessions | Med | local | GPS quality | History | P3 |
| Parcel lines | Access | Dual-use risk | licensed | Very high | heavy | Legal | Research | P4 |
| Cloud sync | Multi-device | Low | backend | Very high | conflict | Privacy trade | Research | P4 |

---

## 14. Final recommendation — top 10 highest-leverage changes

1. **Evidence-class labeling** (Observed / Derived / Modeled / Unknown) on Field Briefing, heat legend, and Explain  
2. **Primary-surface language scrub** to Ecology Standard (ban hotspot / “deer are here” patterns)  
3. **Stewardship cautions** when MODEL implies winter concentration or sensitive cover  
4. **Satellite basemap** under Map & layers (no new permanent chrome)  
5. **Live session distance + coverage glance** on the session strip  
6. **Quick-pick observation capture** (type chips → optional details)  
7. **Explainable Why card** for INSPECT / heat cell (inputs, missing, confidence)  
8. **Trip history browser** (map replay, finds, sign, distance, conditions)  
9. **Expand habitat GIS beyond one AOI** (second pack or pack pipeline) with empty-outside honesty  
10. **Offline strategy spike** (tile pack or cached viewport) with honest degradation  

### Exactly one next implementation slice (do not implement yet)

**Slice name:** `Evidence provenance on primary field surfaces`  

**Scope (independent, validateable):**

1. Adopt Ecology Standard evidence classes in Field Briefing channel rows + heat legend + coach/Where lines.  
2. Scrub primary copy that can read as observed deer presence or find probability.  
3. Add a compact “Missing evidence” line when Confidence is elevated or Habitat MODEL is empty.  
4. Automated string/contract tests for banned phrases on primary surfaces.  
5. No basemap work, no chrome redesign, no new datasets.

**Why this slice first:** It is P0 trust/science, protects Sheds’ strongest differentiator, unlocks every later ecology feature, and fits the accepted mobile architecture without adding floating UI.

**Success criteria:**

- Primary surfaces label Modeled vs Observed  
- Zero banned certainty phrases in Field Briefing / legend / first-run coach  
- Empty Habitat MODEL still empty  
- Field UX + Phase 4 tests still pass  
- Visual QA on 390 portrait briefing + active search  

---

## 15. Known deferred issues

- **Desktop `prompt×here` stacking — pre-existing and intentionally deferred.**  
- Platform consistency `error timeout kind` — unrelated; do not change Sheds to chase it.  
- Field validation walks (W1–W3) still not completed in validation log — schedule separately.
