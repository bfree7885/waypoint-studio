# DFD Article Production — Batch #1 Owner Review Package

**Status:** Publication-ready pages built for editorial review — **DO NOT treat as production-deployed until owner approves.**  
**Branch:** `cursor/dfd-article-batch-1-efa3`  
**Date:** 2026-08-16  
**Video #3:** Remains paused  
**First-10 portfolio:** Unchanged (this batch implements slots 1, 8, 9 from the approved list)

Screenshots live in `docs/deep-forest-dispatch/batch-1/screenshots/` and `/opt/cursor/artifacts/dfd-batch1-review/`.

---

## ARTICLE 1 — Why the Great Salt Lake is two colors

| Field | Value |
| --- | --- |
| Route | `/deep-forest-dispatch/stories/great-salt-lake-two-colors/` |
| Slug | `great-salt-lake-two-colors` |
| Word count (body ≈) | ~694 |
| Sources | 6 |
| Authoritative sources | 6 (USGS, Utah Geological Survey ×2, PLOS ONE, NASA EO ×2) |
| SEO title | Why the Great Salt Lake Is Two Colors — Causeway, Salinity & Microbes — Deep Forest Dispatch |
| Meta description | Why Utah’s Great Salt Lake looks half pink and half blue: the railroad causeway, restricted water exchange, salinity contrast, and the microbes that tint each arm. |
| Original visual | Causeway + salinity / microbial map (`diagrams/gsl-causeway-salinity.jpg`) + annotated NASA ISS base |
| Internal links | Lençóis · Valley fog · Mount Hood rain shadow |
| Waypoint tools | Dashboard · Scenes · Landscape Interpretation |
| Screenshots | `great-salt-lake-two-colors-desktop.jpg` · `…-mobile.jpg` · `…-viz.jpg` · `viz-gsl-causeway-salinity.png` |

**Known scientific caveats**

- Salinity figures are gradient evidence, not permanent barcodes; lake level, season, and causeway openings change absolute values.
- Color intensity varies; do not treat pink/green as fixed paint.
- Bridge/culvert history is summarized without over-detailed engineering claims.

**Source ledger:** `data/deep-forest-dispatch/ledgers/great-salt-lake-two-colors.md`

---

## ARTICLE 2 — Why do valleys fill with fog at dawn?

| Field | Value |
| --- | --- |
| Route | `/deep-forest-dispatch/stories/valley-fog-at-dawn/` |
| Slug | `valley-fog-at-dawn` |
| Word count (body ≈) | ~630 |
| Sources | 5 |
| Authoritative sources | 5 (NWS ×4 + NASA EO) |
| SEO title | Why Valleys Fill with Fog at Dawn — Cold-Air Drainage Explained — Deep Forest Dispatch |
| Meta description | Valley fog forms when overnight cooling and downslope drainage pool cold air until temperature meets the dew point — how to see it from ridges and from satellites. |
| Original visual | Valley-fog air-drainage explainer (`diagrams/valley-fog-drainage.jpg`) |
| Satellite example | NASA EO Victorian Alps MODIS fog (mechanism example; not “the only place”) |
| Internal links | Lenticular · Mount Hood · Great Salt Lake |
| Waypoint tools | Dashboard (temp/humidity/dew point context) · Scenes · Photo Coach — **no invented fog forecast** |
| Screenshots | `valley-fog-at-dawn-desktop.jpg` · `…-mobile.jpg` · `…-viz.jpg` · `viz-valley-fog-drainage.png` |

**Known scientific caveats**

- Not every valley fog event is identical; advection / upslope / steam fog are distinguished in-article.
- Persistent winter cold-pool fog can outlast classic dawn burn-off.
- Australian Alps imagery is an example of the dendritic pattern, not a Utah/US-only claim.

**Source ledger:** `data/deep-forest-dispatch/ledgers/valley-fog-at-dawn.md`

---

## ARTICLE 3 — Why do these clouds look like UFOs — and stay still?

| Field | Value |
| --- | --- |
| Route | `/deep-forest-dispatch/stories/lenticular-clouds-explained/` |
| Slug | `lenticular-clouds-explained` |
| Word count (body ≈) | ~561 |
| Sources | 4 |
| Authoritative sources | 4 (Met Office, NWS ABQ, NASA EO ×2) |
| SEO title | Why Lenticular Clouds Look Like UFOs and Appear to Hover — Deep Forest Dispatch |
| Meta description | Lenticular clouds form in mountain lee waves — air rises, cools, and condenses at wave crests while the cloud shape stays nearly still as air flows through. |
| Original visual | Standing-wave / lenticular explainer (`diagrams/lenticular-standing-wave.jpg`) |
| Satellite example | NASA EO Landsat Taieri Pet (NZ) |
| Internal links | Mount Hood rain shadow · Valley fog · Great Salt Lake |
| Waypoint tools | Dashboard (wind/weather) · Scenes · Photo Coach — **no lenticular detector invented** |
| Screenshots | `lenticular-clouds-explained-desktop.jpg` · `…-mobile.jpg` · `…-viz.jpg` · `viz-lenticular-standing-wave.png` |

**Known scientific caveats**

- Standing *pattern*, not frozen air — article forbids the simplistic “cloud isn’t moving.”
- Waves can exist without visible cloud if air is too dry.
- Aviation turbulence note is brief and non-alarmist.

**Source ledger:** `data/deep-forest-dispatch/ledgers/lenticular-clouds-explained.md`

---

## BATCH REPORT

### Build / test status

- `node scripts/dfd/render-stories.mjs` — pass (5 stories rendered)
- `node automation/test-deep-forest-dispatch.mjs` — pass
- Pages are static HTML under existing DFD architecture (no new page template)

### Mobile status

- Full-page mobile screenshots captured at 390×844 for all three stories + library
- Layout uses existing `wds-dfd.css` story shell; diagrams are full-width figures

### SEO status

- Human titles + SEO titles, meta descriptions, canonicals, OG tags, Article JSON-LD
- **No VideoObject** (youtubeVideoId null; film-pending block only)
- Sitemap entries added for all three routes
- Library crawlable cards updated

### Provenance status

- NASA ISS / Landsat / MODIS imagery with credits on-page
- Source ledgers committed under `data/deep-forest-dispatch/ledgers/`
- Assets README updated

### Analytics status

- Existing hooks only: story boot → `DFD_STORY_VIEW`; related clicks; `DFD_WAYPOINT_TOOL_CLICK` on tool links
- No new analytics system

### Reusable vs article-specific

| Reusable | Article-specific |
| --- | --- |
| JSON → render pipeline | Three story JSON files |
| DFD CSS/JS/analytics | Three original diagrams + NASA crops |
| Catalog / library / sitemap pattern | Three source ledgers |
| Screenshot harness (`capture-dfd-batch1-screenshots.mjs`) | Owner-review docs for this batch |
| Strategy docs (from approved PR #40) | Related-story graph updates |

### Quality concerns / remaining manual work

1. **Owner editorial read** of all three for voice, caveats, and “would this exist with zero traffic?”
2. Optional: SVG source files for the three new diagrams (PNG/JPG shipped; prior pattern had SVG+PNG)
3. Optional: higher-res US valley-fog satellite example if editor prefers a Northern Hemisphere hero (AU Alps is scientifically valid as pattern evidence)
4. **Do not merge/deploy as “published live”** until owner sign-off — catalog `status` is `published` so the library preview shows cards in this PR; change to a draft status if you want them hidden from the live catalog after merge without deploy gating
5. Video companions remain intentionally empty

### Scaling recommendation

**Conditionally yes — safe to scale to the next 3–5 articles** after owner review of this batch, provided:

- Keep the ledger → claim plan → original visual → draft → fact check discipline (do not skip to prose)
- Cap concurrent drafts at 2–3
- Reuse diagram visual language established here
- Do not start Video #3 or redesign the library

If editorial finds AI-farm tone, weak visuals, or unsupported claims in this batch, fix the workflow before scaling.

### Production time

Not precisely instrumented across the cloud session; treat as one focused production block for three stories + review package (research through screenshots). Calendar estimates intentionally omitted per agent policy.
