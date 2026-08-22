# DFD Article Production — Batch #2 Owner Review Package

**Status:** Publication-ready pages built for editorial review — **DO NOT treat as production-deployed until owner approves.**  
**Branch:** `cursor/dfd-article-batch-2-efa3`  
**Date:** 2026-08-16  
**Video #3:** Remains paused  
**First-10 portfolio:** Implements Okavango dry-season flood, Richat / Eye of the Sahara, and Namib dune migration (evidence gate PASS)

Screenshots live in `docs/deep-forest-dispatch/batch-2/screenshots/` and `/opt/cursor/artifacts/dfd-batch2-review/`.

Quality floor: `docs/deep-forest-dispatch/DFD-ARTICLE-QUALITY-GATE.md` (no new QA framework).

---

## ARTICLE 4 — Why the Okavango Delta floods in the dry season

| Field | Value |
| --- | --- |
| Route | `/deep-forest-dispatch/stories/okavango-dry-season-flood/` |
| Slug | `okavango-dry-season-flood` |
| Word count (body ≈) | ~444 |
| Sources | 4 |
| Authoritative sources | 4 (HESS peer-reviewed + NASA EO ×3) |
| SEO title | Why the Okavango Delta Floods in the Dry Season — Flood Pulse Explained — Deep Forest Dispatch |
| Meta description | The Okavango’s dry-season flood is delayed river water from Angola — how distance, shallow gradients, and floodplains create the lag. |
| Original visual | **Flood-pulse travel map** (`diagrams/okavango-flood-pulse.png`) + MODIS wet/dry greenness compare |
| Internal links | Great Salt Lake · Lençóis Maranhenses |
| Waypoint tools | Landscape Interpretation (1 CTA) |
| Screenshots | `okavango-dry-season-flood-desktop.jpg` · `…-mobile.jpg` · `…-viz.jpg` |

**Known scientific caveats**

- Timing and extent vary by year; diagram is schematic, not a surveyed hydrograph.
- Lag is distance **plus** slow delta/floodplain propagation — not “rain takes months” as a single hop.
- Local rainfall can matter in some years; the durable average story is the delayed highland pulse.
- Inlet peak often ~April; maximum inundated area often ~Aug–Sep (HESS 2006).

**Source ledger:** `data/deep-forest-dispatch/ledgers/okavango-dry-season-flood.md`

---

## ARTICLE 5 — What carved the Eye of the Sahara?

| Field | Value |
| --- | --- |
| Route | `/deep-forest-dispatch/stories/eye-of-the-sahara-richat/` |
| Slug | `eye-of-the-sahara-richat` |
| Word count (body ≈) | ~303 |
| Sources | 5 |
| Authoritative sources | 5 (GSA Bulletin, Geology, Journal of African Earth Sciences, NASA EO, IUGS Geoheritage) |
| SEO title | What Carved the Eye of the Sahara? Richat Structure Explained — Deep Forest Dispatch |
| Meta description | The Eye of the Sahara is a deeply eroded geologic dome in Mauritania — why it looks like an impact crater and what evidence rules that out. |
| Original visual | **Richat rings / geologic cross-section** (`diagrams/richat-rings-section.png`) + Landsat hero |
| Internal links | Mount Hood rain shadow · Great Salt Lake |
| Waypoint tools | Landscape Interpretation (1 CTA) |
| Screenshots | `eye-of-the-sahara-richat-desktop.jpg` · `…-mobile.jpg` · `…-viz.jpg` |

**Known scientific caveats**

- Not framed as “scientists solved the Eye forever.”
- Clear: not impact (no shock features); concentric layers + differential erosion after doming; igneous activity belongs in the deep story.
- Still refined: polyphase timing/sequence of magmatic pulses.
- No Atlantis / conspiracy material.

**Source ledger:** `data/deep-forest-dispatch/ledgers/eye-of-the-sahara-richat.md`

---

## ARTICLE 6 — Satellites caught these dunes moving

| Field | Value |
| --- | --- |
| Route | `/deep-forest-dispatch/stories/namib-dunes-moving-satellites/` |
| Slug | `namib-dunes-moving-satellites` |
| Selected location | Sperrgebiet / southern Namib Desert, Namibia |
| Evidence gate | **PASS** |
| Word count (body ≈) | ~363 |
| Sources | 2 |
| Authoritative sources | 2 (NASA EO Racing Dunes + Scheidt & Lancaster ESPL / ASTER–COSI-Corr) |
| Documented migration | Landsat 8/9 annual frames 2013–2022; rates ~7–32 m/yr typical; large ~9 m/yr; some small up to ~83 m/yr (reported) |
| Original visual | **Real dune migration comparison** (2013↔2022 registered Landsat wipe) + mechanism diagram |
| Internal links | Lençóis Maranhenses · Richat |
| Waypoint tools | Scenes (1 CTA) |
| Screenshots | `namib-dunes-moving-satellites-desktop.jpg` · `…-mobile.jpg` · `…-viz.jpg` |

**Known scientific caveats**

- Rates are published ranges — this page does not invent meter-scale pixel measurements.
- Compare frames are presentation extracts of the NASA EO Landsat sequence; provenance stays with EO #150808 + paper.
- Mechanism: grain-by-grain transport / saltation / slip-face advance — not whole-pile sliding.
- Other deserts migrate; this corridor was chosen for clearest public demonstration.

**Source ledger:** `data/deep-forest-dispatch/ledgers/namib-dunes-moving-satellites.md`

---

## LIBRARY

| Shot | File |
| --- | --- |
| Desktop | `library-desktop.jpg` |
| Mobile | `library-mobile.jpg` |
| Story count | **8** (Mount Hood, Lençóis, GSL, valley fog, lenticular, Okavango, Richat, Namib dunes) |

---

## BATCH REPORT

### Build / test status

- `node scripts/dfd/render-stories.mjs` — pass (8 stories)
- `node automation/test-deep-forest-dispatch.mjs` — pass
- Existing DFD architecture only (JSON → render → static HTML); compare aria-label made label-aware (tiny renderer fix)

### Quality-gate status

- All three articles checked against `DFD-ARTICLE-QUALITY-GATE.md`
- Richat body Landsat duplicate of hero removed; original diagram moved early
- Namib hero set to 2022 frame so the 2013 compare side is not a hero replay
- Okavango diagram labels aligned to HESS timing (inlet ~Apr; peak inundation often ~Aug–Sep)

### Mobile status

- Full-page mobile screenshots at 390×844 for all three + library
- Diagrams and compare controls use existing full-width DFD figures

### SEO / provenance

- Title, meta, canonical, OG, Article JSON-LD, alt text, sitemap entries
- **No VideoObject**; film-pending blocks only
- NASA / peer-reviewed credits on-page; ledgers committed; assets README updated

### Provenance status

- Okavango: ISS + MODIS (NASA EO) + Waypoint flood-pulse map
- Richat: Landsat (NASA EO / USGS) + Waypoint rings/section diagram
- Namib: Landsat Racing Dunes sequence (NASA EO #150808) + Scheidt & Lancaster rates + Waypoint mechanism diagram

### Major limitations

1. OSM map iframes may appear blank in headless screenshot environments (live browsers load normally).
2. Namib compare is first/last EO annual frames — not a DIY co-registered DEM product.
3. Catalog `status` is `published` for PR preview; do not treat merge as production deploy without owner sign-off.
4. Video #3 and remaining First-10 articles not started.

### Recommendation for next batch

Proceed with the next approved First-10 trio only after owner editorial/visual sign-off on this batch. Keep the existing workflow and quality gate. Do not redesign DFD. Keep Video #3 paused until explicitly resumed.
