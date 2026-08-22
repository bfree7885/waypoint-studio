# DFD Article Batch #1 — Owner Review V2 (Editorial + Visual QA)

**Status:** QA pass complete — still **not** production-deployed  
**Branch:** `cursor/dfd-article-batch-1-efa3`  
**Prior:** `OWNER-REVIEW.md` (V1 production)  
**Screenshots:** `docs/deep-forest-dispatch/batch-1/screenshots-v2/` · `/opt/cursor/artifacts/dfd-batch1-review-v2/`  
**Quality gate:** `docs/deep-forest-dispatch/DFD-ARTICLE-QUALITY-GATE.md`

---

## ARTICLE 1 — Great Salt Lake

| | |
| --- | --- |
| Route | `/deep-forest-dispatch/stories/great-salt-lake-two-colors/` |
| Final word count | ~452 |
| Original value | Causeway → salinity → biology → color map early in the story; NASA ISS hero |
| Sources / provenance | 6 authoritative; ledger unchanged; credits on-page |

**Editorial changes**

- Rewrote deck/opening for immediate causeway contrast
- Moved original diagram into the first section (was buried after long prose)
- Removed duplicate orbit photo and annotated duplicate of the same ISS frame
- Merged salinity + biology; cut academic asides and templated “Explore further”
- Related links: Lençóis + Mount Hood only (dropped weak valley-fog link)
- CTAs: Dashboard + Scenes only; honest “not a lake-color forecast”

**Science corrections**

- None material; reinforced variability (“not permanent paint”) and gradient-not-barcode framing

**Visual changes**

- Regenerated causeway map (geographic arms, restrained labels, quiet causal chain)
- Quieter film-pending chrome; diagram full-bleed on mobile

**Remaining limitation**

- OSM embed may appear blank in headless screenshots (tiles); fine in browsers
- North-arm detail photo is portrait and secondary — acceptable, not hero-grade

---

## ARTICLE 2 — Valley fog

| | |
| --- | --- |
| Route | `/deep-forest-dispatch/stories/valley-fog-at-dawn/` |
| Final word count | ~385 |
| Original value | Single night cross-section + short day/night/sunrise stages; Dashboard dew-point observation |
| Sources / provenance | 5 authoritative; NASA EO Alps example clearly labeled as example imagery |

**Editorial changes**

- Cut duplicate satellite figure (was identical to hero)
- Collapsed cooling / drainage / dew point into one mechanism section
- Removed templated Waypoint section + Explore further; wove honesty into “Other ways fog forms”
- Related: Lenticular + Mount Hood only
- CTAs: Dashboard + Scenes; no Photo Coach promo stack

**Science corrections**

- None material; kept multi-mechanism distinction and burn-off caveats

**Visual changes**

- Replaced six-panel + bullet-box diagram with one spatial valley night scene + three quiet stages
- Mobile full-bleed diagram treatment

**Remaining limitation**

- Hero is Southern Hemisphere example; mechanism is global — stated in copy, but US readers may want a US satellite later (optional, not blocking)

---

## ARTICLE 3 — Lenticular clouds

| | |
| --- | --- |
| Route | `/deep-forest-dispatch/stories/lenticular-clouds-explained/` |
| Final word count | ~403 |
| Original value | Standing-wave diagram with continuous airflow through a stationary form |
| Sources / provenance | 4 authoritative; Taieri Pet Landsat hero |

**Editorial changes**

- Removed duplicate body Landsat (same as hero) and weak NZ map interrupt
- Diagram immediately after the paradox
- Cut formulaic Connect/Explore sections; one natural closing weave to Mount Hood + tools
- Related: Mount Hood + Valley fog only
- CTAs: Dashboard + Scenes with non-detector language

**Science corrections**

- None material; kept NWS “develop / dissipate” framing; no “cloud isn’t moving” claim

**Visual changes**

- Regenerated standing-wave graphic (flow arrows, stacked plates, evaporate label, second crest)

**Remaining limitation**

- No ground-level photograph (satellite-only example); a future credited field photo would enrich without changing the science

---

## LIBRARY

Five stories now present (2 film-companion-ready + 3 article-first). Cards coexist on the same grid.

- Desktop: `screenshots-v2/library-desktop.jpg`
- Mobile: `screenshots-v2/library-mobile.jpg`

Feels like a real collection beginning — geographic and topical diversity is visible. No library redesign performed.

---

## SYSTEM

| | |
| --- | --- |
| Quality gate | `docs/deep-forest-dispatch/DFD-ARTICLE-QUALITY-GATE.md` (wired into production workflow) |
| Tests | `node scripts/dfd/render-stories.mjs` · `node automation/test-deep-forest-dispatch.mjs` — pass |
| Build | Static site; no separate production build required for DFD HTML |

### Overall assessment

**READY TO SCALE** — with discipline.

The workflow is good enough to repeat **if** every next article clears the quality gate (especially original visual early, no duplicate hero imagery, differentiated structure, honest tool links).

### Recommended next batch size

**3 articles** (same as Batch #1). Do not jump to 5 until one more batch clears owner review at this floor.

### Still paused

- Articles #4–#10 production (beyond planning)
- DFD Video #3
- Merge / production deploy (owner decision)
