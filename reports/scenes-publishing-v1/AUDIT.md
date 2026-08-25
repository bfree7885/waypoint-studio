# Scenes + Publishing Unification — Audit

**Date:** 2026-08-25  
**Branch:** `chore/product-direction-reconciliation`  
**Tip at audit start:** `58836e76`  
**Canonical:** `docs/PRODUCT-DIRECTION.md`  
**Dashboard Discover (preserve):** `docs/DASHBOARD-DISCOVER.md` · commit `cc03bd5d`

---

## Verdict

Three valuable systems sit side by side but do not yet feel like one storytelling loop:

1. **Scenes** — photography craft hub + live tools (Coach, Library, Auto Edit, Moving Scenes, Hidden Landscapes).
2. **Articles** — curated third-party RSS + Waypoint Take (1 first-party sample).
3. **Deep Forest Dispatch** — 12 first-party visual Earth stories + 1 live YouTube film.

Publishing is already framed as shared infrastructure in product direction. Runtime joins are thin: static “Go deeper” hub links from Dashboard, generic DFD→Scenes CTAs, Scenes→Articles related mount. No opportunity-aware story matching.

---

## Scenes findings

| Item | Status | Note |
|------|--------|------|
| Hub `/apps/scenes/` | Live | Craft-forward; weak Publishing framing |
| `/scenes/` short path | Redirects to Photo Coach | Skips hub IA |
| Photo Coach / Library / Auto Edit / Moving / HL | Live | Strong craft loop |
| Scene Builder / Profile | Preview | Honest Later section |
| `experiences.json` | Unused | Not runtime SSOT |
| Nav registry vs runtime config | Drift | JSON ≠ `wds-app-nav-config.js` |
| Analytics | None on Scenes | DFD has `DFD_*` hooks only |
| Hub ↔ DFD | Weak | Journey “Learn” → Articles only |

**KEEP:** craft loop, honest Preview/Later, related-articles mount.  
**IMPROVE:** hub language for Explore & Understand; Publishing stories section; `/scenes/` → hub.  
**DO NOT:** turn Scenes into an article index; rewrite craft tools.

---

## Publishing / Articles findings

| Item | Status |
|------|--------|
| Articles hub | Live curated feed (120 cards) |
| First-party samples | 1 (`reading-todays-conditions`) |
| RSS pipeline | Live + CI refresh |
| Category landings | Thin shells |
| Articles → DFD | Already linked in hub hero |
| Articles → Scenes tools | Weak |

**KEEP AS WAYPOINT:** Articles hub + RSS + Take.  
**REFACTOR INTO SHARED PUBLISHING:** templates, sample, relationships.

---

## Deep Forest Dispatch findings

| Item | Count / status |
|------|----------------|
| Published stories | 12 |
| YouTube wired | 1 (Mount Hood) |
| Video packages documented | 2 (Hood, Lençóis; Lençóis ID null) |
| Research ledgers | 10 (missing Hood + Lençóis) |
| Analytics events | `DFD_*` CustomEvents (no consumer) |
| Related stories | Present in JSON |
| Continue in Waypoint | Present (Dashboard/Scenes links) |

**Subjects include:** Mount Hood rain shadow, Lençóis, Great Salt Lake, valley fog, lenticulars, Okavango, Richat, Namib dunes, Lake Eyre, Scablands, K'gari, Columbia Glacier.

**KEEP AS EDITORIAL LABEL:** Deep Forest Dispatch name / YouTube channel.  
**REFACTOR INTO SHARED PUBLISHING:** story JSON, render, catalog, analytics bus.  
**DO NOT:** make DFD a fourth flagship product; delete stories.

---

## Dashboard handoffs (Discover complete)

| Path | Today |
|------|--------|
| Go deeper | Static Articles / Scenes / DFD hubs |
| HN → Scenes | Only when intel `toolLinks` justifies |
| Signal → specific story | **Missing** |

Preserve Discover honesty. Add matches only when editorial rules fire; never invent relevance.

---

## Content-generation pipeline (real)

```
DFD: TOPIC → RESEARCH → LEDGER → BLUEPRINT → DRAFT → FACT CHECK → RENDER → QC → PUBLISH → MEASURE
Articles: FEED FETCH → SANITIZE → SCORE → SUMMARIZE → TAKE → JSON/RSS
Content Engine: regional bundles for product homes (not DFD pages)
```

Evidence: `docs/deep-forest-dispatch/DFD-ARTICLE-PRODUCTION-WORKFLOW.md`, `docs/WAYPOINT-CONTENT-ENGINE.md`, `scripts/articles/*`, `scripts/dfd/render-stories.mjs`.

---

## Classification matrix

| Component | Decision |
|-----------|----------|
| Scenes craft tools | **KEEP** |
| Scenes hub IA | **IMPROVE** (Publishing join) |
| `/scenes/` → Coach | **REPOSITION** → hub |
| Articles RSS hub | **KEEP AS WAYPOINT** |
| DFD stories + render | **REFACTOR INTO SHARED PUBLISHING** |
| “Deep Forest Dispatch” brand | **KEEP AS EDITORIAL LABEL / SERIES** |
| Content Engine regions | **KEEP** (product-adjacent) |
| GS / Side Trail articles | **ARCHIVE** (not Studio merge) |
| Fake SEO / filler stories | **REMOVE** (do not create) |
| experiences.json unused | **IMPROVE or ARCHIVE** (do not invent consumers) |

---

## Phase implementation targets (from this audit)

1. Shared `content-relationships` + deterministic publishing match.  
2. Dashboard deepeners: opportunity-aware “Understand” only when matched.  
3. Scenes hub: Understand / stories pathway without becoming a blog index.  
4. `/scenes/` → `/apps/scenes/`.  
5. DFD library: explicit Waypoint Publishing series framing.  
6. Docs `SCENES-PUBLISHING.md` + tests + CDP + FINAL-REPORT.  

**Out of scope:** Sheds V3.2, Deck, Cyber/GS, OpenRoad, Fieldry, Savant, Dashboard Discover rewrite, mass new articles, paywalls, LLM embeddings.
