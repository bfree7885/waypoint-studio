# Scenes + Publishing Unification — Final Report

**Date:** 2026-08-25  
**Branch:** `chore/product-direction-reconciliation`  
**Starting commit:** `58836e76` (Dashboard Discover tip)  
**Final commit:** `d378e95d`

---

## 1–5. Branch / commits / files

| | |
|--|--|
| Branch | `chore/product-direction-reconciliation` |
| Start | `58836e76` |
| Feature commit | `d378e95d` |

### Key files added
- `docs/SCENES-PUBLISHING.md`
- `data/publishing/content-relationships.json`
- `design-system/js/platform/wds-publishing-match.js`
- `automation/test-scenes-publishing.mjs`
- `automation/capture-scenes-publishing.mjs`
- `reports/scenes-publishing-v1/AUDIT.md`
- `reports/scenes-publishing-v1/FINAL-REPORT.md`
- `reports/scenes-publishing-v1/CDP-VERIFY.json`
- `reports/scenes-publishing-v1/screenshots/*` (20 PNGs)

### Key files modified
- Dashboard deepeners + rebuild paint (Understand handoff; Discover architecture preserved)
- `apps/scenes/index.html` + `scenes-home.css`
- `scenes/index.html` → hub redirect
- `articles/index.html`, `deep-forest-dispatch/index.html`
- `scripts/dfd/render-stories.mjs` + regenerated 12 story HTML pages
- `design-system/js/wds.js` (load order)
- `wds-app-nav-config.js` / `wds-app-nav.js` (Scenes related; Fieldry paused; related filter)
- `docs/PRODUCT-DIRECTION.md`, `docs/ENGINEERING-PLAYBOOK.md`

### Deleted
- none

---

## 6–9. Audits & classification

See `AUDIT.md`. Summary:

| Area | Decision |
|------|----------|
| Scenes craft tools | **KEEP** |
| Scenes hub | **IMPROVE** — Explore & Understand + Publishing stories |
| `/scenes/` | **REPOSITION** → `/apps/scenes/` |
| Articles RSS | **KEEP AS WAYPOINT** |
| DFD stories/render | **REFACTOR INTO SHARED PUBLISHING** |
| DFD brand | **KEEP AS EDITORIAL LABEL** |
| Content Engine regions | **KEEP** (product-adjacent) |
| Fake relevance / filler | **REMOVE** (not created) |

---

## 10–14. Content architecture & roles

| Role | After this phase |
|------|------------------|
| **Scenes** | Explore & understand — craft loop + pathway into Publishing stories |
| **Article** | Curated field reading (RSS) + rare first-party; entry to Studio |
| **Video** | First-class companion on stories that earn film (Mount Hood live) |
| **DFD** | Waypoint Publishing editorial series of visual Earth stories |

One subject may have story ± video ± Scenes path. Never required for all formats.

---

## 15–17. Handoffs / matching / related

- **Dashboard → content:** deepeners `Understand this` via `WDS.publishingMatch.matchDiscovery` — only when justified; otherwise hidden.
- **Matching:** keywords on signals, explicit topics, or labeled `quiet-humid-cool` condition rule (valley fog). Documented in `SCENES-PUBLISHING.md`.
- **Related:** DFD relatedStories unchanged; Continue in Waypoint now adds Watch (when YT) + Browse Articles; Scenes hub lists exemplar stories; Articles ↔ DFD ↔ Scenes cross-links in heroes.

---

## 18–19. Content preserved / repositioned

- All 12 DFD stories preserved and re-rendered.
- Mount Hood video wiring preserved.
- Articles RSS pipeline untouched.
- DFD repositioned as editorial series (copy), not deleted.
- Scenes hub reframed without converting into a blog index.

---

## 20–21. Pipeline & verification

Real pipeline documented (DFD ledger workflow + Articles refresh + Content Engine).  
Safeguard: matching never invents stories; condition matches labeled non-forecast; DFD sources/ledgers remain production gate.

---

## 22. Analytics

`DFD_*` hooks preserved (including new connection clicks for video/articles). No invented metrics.

---

## 23–27. UX / a11y / perf / visual

- Mobile CDP: 375 / 390 / 430 + desktop — no overflow on hubs/stories.
- Scenes Publishing section uses existing elsewhere list patterns.
- Palette: Scenes/DFD imagery unchanged; UI kickers stay SW family.
- Perf: no new heavy assets; DFD lazy images retained.
- A11y: understand section starts `hidden`; semantic headers preserved.

---

## 28. Tests (exact)

| Suite | Result |
|-------|--------|
| `test-scenes-publishing.mjs` | **PASS** |
| `test-dashboard-discover.mjs` | **PASS** |
| `test-deep-forest-dispatch.mjs` | **PASS** |
| `test-dashboard-instrument-panel.mjs` | **PASS** |
| `test-dashboard-depth.mjs` | **PASS** |
| `capture-scenes-publishing.mjs` | **PASS** (20 shots) |

---

## 29–30. Browser / screenshots

`reports/scenes-publishing-v1/CDP-VERIFY.json`  
Screenshots: scenes-hub, articles-hub, dfd-library, valley-fog, mount-hood × 375/390/430/desktop.

---

## 31. Known issues

- Articles curated feed cards may still tag paused apps (Fieldry) in relatedProducts — deferred feed hygiene.
- Lençóis YouTube ID still null.
- Ledgers missing for Mount Hood + Lençóis film heroes.
- Nav-registry JSON still drifts from runtime config (partially addressed for Scenes related only).
- Opportunity match coverage is intentionally sparse (honesty over volume).

---

## 32. Deferred

Sheds V3.2 · Deck · Cyber/GS · OpenRoad · Fieldry revival · embeddings · mass new stories · paywalls · full nav-registry sync · Scenes tool deep-links with lesson IDs · analytics consumer.

---

## 33. Next three priorities only

1. **Opportunity coverage + Dashboard HN “Understand” actions** for additional justified signal→story pairs (still sparse).  
2. **Articles feed hygiene** — strip paused-product relatedProduct links; optional DFD story cards on Articles hub.  
3. **Sheds V3.2** (when ready) — keep Discover + Publishing loops stable.

---

## Product test

**Notice → understand → story → discover more:** Dashboard can surface valley-fog understanding when matched; Scenes and DFD/Articles now point at each other without competing as four flagships.

**External article/video → Waypoint:** Mount Hood story offers Watch + Articles + Scenes; DFD library names Publishing series explicitly.
