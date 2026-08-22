# DFD Article Production — Batch #3 Owner Review Package

**Status:** Final First-10 portfolio stories built for editorial review — **DO NOT treat as production-deployed until owner approves.**  
**Branch:** `cursor/dfd-article-batch-3-efa3`  
**Date:** 2026-08-16  
**Video #3:** Remains paused  
**Content production:** **STOP** after this batch — publish → index → measure next

Screenshots: `docs/deep-forest-dispatch/batch-3/screenshots/` and `/opt/cursor/artifacts/dfd-batch3-review/`.  
Quality floor: `docs/deep-forest-dispatch/DFD-ARTICLE-QUALITY-GATE.md`  
Portfolio diagnostic: `docs/deep-forest-dispatch/DFD-INITIAL-PORTFOLIO-REPORT.md`

---

## ARTICLE 7 — When does the desert become a sea?

| Field | Value |
| --- | --- |
| Route | `/deep-forest-dispatch/stories/kati-thanda-lake-eyre-fills/` |
| Slug | `kati-thanda-lake-eyre-fills` |
| Word count (body ≈) | ~304 |
| Sources | 4 |
| Authoritative sources | 4 (NASA EO ×3 + Geoscience Australia) |
| Original visual | **Water that travels across the desert** map + registered MODIS Apr→May 2025 compare |
| Internal links | Okavango · Great Salt Lake |
| Waypoint tools | None (remote terminal-basin story) |
| Screenshots | `kati-thanda-lake-eyre-fills-{desktop,mobile,viz}.jpg` |

**Caveats:** Partial fills ≠ complete fills; “inland sea” is figurative; fill frequency irregular; evaporation dominates after inflows stall.

**Ledger:** `data/deep-forest-dispatch/ledgers/kati-thanda-lake-eyre-fills.md`

---

## ARTICLE 8 — Why does this landscape look flood-carved?

| Field | Value |
| --- | --- |
| Route | `/deep-forest-dispatch/stories/channeled-scablands-floods/` |
| Slug | `channeled-scablands-floods` |
| Word count (body ≈) | ~286 |
| Sources | 4 |
| Authoritative sources | 4 (NASA EO ×2 + NPS + IUGS) |
| Original visual | **Ice Age flood path / landscape evidence map** + Landsat channel detail |
| Internal links | Richat · Columbia Glacier |
| Waypoint tools | Landscape Interpretation (1) |
| Screenshots | `channeled-scablands-floods-{desktop,mobile,viz}.jpg` |

**Caveats:** Repeated floods, not one cartoon event; magnitude figures are study-dependent; Bretz mentioned only as brief scientific history.

**Ledger:** `data/deep-forest-dispatch/ledgers/channeled-scablands-floods.md`

---

## ARTICLE 9 — How can a rainforest grow on pure sand?

| Field | Value |
| --- | --- |
| Route | `/deep-forest-dispatch/stories/kgari-rainforest-on-sand/` |
| Slug | `kgari-rainforest-on-sand` |
| Word count (body ≈) | ~284 |
| Sources | 3 |
| Authoritative sources | 3 (NASA EO + UNESCO + university chronosequence coverage) |
| Original visual | **Dune age → soil → succession** diagram |
| Internal links | Lençóis · Namib dunes |
| Waypoint tools | None |
| Screenshots | `kgari-rainforest-on-sand-{desktop,mobile,viz}.jpg` |

**Caveats:** “Pure sand” is rhetorical; nutrients are recycled, not invented; oldest dunes can be more leached; succession is nuanced.

**Ledger:** `data/deep-forest-dispatch/ledgers/kgari-rainforest-on-sand.md`

---

## ARTICLE 10 — Columbia Glacier (nearly 40 years)

| Field | Value |
| --- | --- |
| Selected glacier | **Columbia Glacier, Alaska** |
| Evidence gate | **PASS** |
| Observation interval | Landsat World of Change **1986–2024** (~38 years); rapid retreat began ~1980 |
| Route | `/deep-forest-dispatch/stories/columbia-glacier-satellite-retreat/` |
| Word count (body ≈) | ~310 |
| Sources | 3 |
| Authoritative sources | 3 (NASA EO WoC + related EO articles) |
| Original visual | **Real 1986↔2024 Landsat compare** + tidewater moraine/calving diagram |
| Title note | “Nearly 40 years” — not forced exact 40 |
| Internal links | Namib dunes · Mount Hood |
| Waypoint tools | None |
| Screenshots | `columbia-glacier-satellite-retreat-{desktop,mobile,viz}.jpg` |

**Caveats:** Tidewater mechanics + climate nudge; uneven pace; branch split; rates/geometry from NASA EO — not DIY pixel measure.

**Ledger:** `data/deep-forest-dispatch/ledgers/columbia-glacier-satellite-retreat.md`

---

## LIBRARY

| Shot | File |
| --- | --- |
| Desktop | `library-desktop.jpg` |
| Mobile | `library-mobile.jpg` |
| Story count | **12** |

---

## BATCH REPORT

### Build / test
- `node scripts/dfd/render-stories.mjs` — pass (12 stories)
- `node automation/test-deep-forest-dispatch.mjs` — pass
- Empty Waypoint CTAs allowed when no product fit (test updated)

### Quality gate
- All four checked against existing `DFD-ARTICLE-QUALITY-GATE.md`
- Glacier evidence gate PASS before draft
- No new QA framework

### Provenance / mobile / SEO
- NASA/USGS/NPS/UNESCO/GA credits on-page; ledgers committed
- Mobile full-page shots at 390×844
- Canonical, OG, Article JSON-LD, sitemap, robots Allow, analytics hooks present
- **No VideoObject**

### Known limitations
1. OSM iframes may blank in headless screenshots
2. Catalog `published` for PR preview — not auto-deploy
3. Some AU agency URLs block automated HEAD checks; on-page sources prefer NASA/UNESCO/GA with stable public access
4. **No further content production** until owner review + publish/measure phase
