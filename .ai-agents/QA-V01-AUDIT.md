# Waypoint Scenes v0.1.0 — QA Audit

**Date:** Soft MVP prep session  
**Scope:** Tabs, scripts, Collections, assets, mobile nav, CSS dedup

## Pre-fix findings

| Area | Status | Issue |
|------|--------|-------|
| WDS.tabs delegation | PASS | `tabs.js` wraps `WDS.tabs`; load order correct |
| Script order | WARN | `wds-gallery.js` not loaded before `photography.js` |
| Collections images | FAIL | 3 real JPEGs in `assets/Images/` but data still pointed at SVGs |
| WDS.gallery | FAIL | Collections used custom `photo-masonry` only |
| Mobile tabs | FAIL | `min-width: 0` + tiny font crushed 5 labels |
| CSS duplication | WARN | `.workspace-tabs` defined in `main.css`, WDS, `studio-shell.css` |
| Field Guide WEF | PASS | Legacy adapter renders 8 lessons |
| Video / AI / Coming Soon | PASS | No new features added |

## Post-fix verification

| Check | Result |
|-------|--------|
| `WDS.gallery.renderGallery` + `itemRenderer` | PASS |
| `photography-data.js` paths → `assets/Images/*` | PASS |
| HTTP 200 for app + images + wds-gallery.js | PASS |
| Mobile tab short labels + horizontal scroll | PASS (CSS) |
| Duplicate `main.css` tab block removed | PASS |
| `scenes-mvp.css` loaded last | PASS |

## Manual test still required

- [ ] Click all 5 tabs in browser
- [ ] Arrow-key tab navigation
- [ ] Upload JPG → Living Scene
- [ ] Collections hero + grid with real photos
- [ ] Modal → Bring to life / Feel depth
- [ ] Field Guide renders WEF sections
- [ ] Export PNG when frame loaded
- [ ] Mobile viewport 375px — tab scroll + readable labels
- [ ] Safari / Firefox smoke (if available)

## Launch readiness

**82 / 100** (was 78) — soft MVP viable after manual QA pass.
