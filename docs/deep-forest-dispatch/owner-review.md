# Deep Forest Dispatch — Owner Review

**Branch:** `cursor/deep-forest-dispatch-library-efa3`  
**Date:** 2026-08-16  
**Status:** Ready for owner review — stop here (do not begin Video #3)

## What shipped

A reusable **Deep Forest Dispatch** content library for Waypoint Studio’s editorial / discovery layer, plus companion stories for Videos #1 and #2.

### Implemented routes

| Route | Purpose |
|-------|---------|
| `/deep-forest-dispatch/` | Library / destination |
| `/deep-forest-dispatch/stories/mount-hood-rain-shadow/` | Story #1 — Cascade rain shadow |
| `/deep-forest-dispatch/stories/lencois-maranhenses/` | Story #2 — Lençóis Maranhenses |

Light cross-link from `/articles/` (curated RSS hub remains separate).

### Content architecture

```text
data/deep-forest-dispatch/catalog.json          # library index
data/deep-forest-dispatch/stories/<slug>.json   # source of truth
scripts/dfd/render-stories.mjs                  # → crawlable HTML
deep-forest-dispatch/index.html                 # library
deep-forest-dispatch/stories/<slug>/index.html  # generated pages
design-system/css/wds-dfd.css
design-system/js/dfd/*
assets/images/deep-forest-dispatch/
docs/deep-forest-dispatch/DFD-CONTENT-WORKFLOW.md
```

Adding Video #3 ≈ **content JSON + media + catalog entry + render + sitemap card** — not new page engineering. See workflow doc.

### YouTube ID mechanism

Story field: `youtubeVideoId` (`null` or public ID string).

- `null` → finished “Film companion coming soon” panel (no broken player)
- real ID → nocookie embed + VideoObject JSON-LD on re-render

**No YouTube IDs invented** for #1 / #2.

### SEO

- Unique title + meta description  
- Canonical URL  
- Open Graph + Twitter card  
- Crawlable article HTML (not JS-only)  
- Semantic headings, image alt text, internal links  
- `sitemap.xml` entries  
- Article structured data; VideoObject **only** when ID present  

### Analytics

Lightweight hooks (`design-system/js/dfd/wds-dfd-analytics.js`):

- `DFD_LIBRARY_VIEW`
- `DFD_STORY_VIEW`
- `DFD_VIDEO_PLAY` (best-effort)
- `DFD_RELATED_STORY_CLICK`
- `DFD_WAYPOINT_TOOL_CLICK`
- `DFD_YOUTUBE_CLICK`

Emits `waypoint:analytics` CustomEvents + `__WAYPOINT_ANALYTICS_QUEUE__`. No paid platform.

### Screenshots

| File | View |
|------|------|
| `screenshots/01-library-desktop.png` | Library desktop |
| `screenshots/02-library-mobile.png` | Library mobile |
| `screenshots/10-library-cards-desktop.png` | Library story cards |
| `screenshots/03-story1-desktop.png` | Story #1 desktop |
| `screenshots/04-story1-mobile.png` | Story #1 mobile |
| `screenshots/05-story2-desktop.png` | Story #2 desktop |
| `screenshots/06-story2-mobile.png` | Story #2 mobile |
| `screenshots/07-story1-rain-shadow-diagram.png` | Rain-shadow science section |
| `screenshots/08-story2-season-compare.png` | Seasonal / caution / space section |
| `screenshots/09-story1-waypoint-connections.png` | Related Waypoint connections |

Also mirrored under `/opt/cursor/artifacts/dfd-review/` in the cloud agent environment.

### Known limitations

1. **YouTube IDs absent** until DFD publishes public videos.  
2. **Lençóis wet/dry compare** uses educational seasonal emphasis derivatives of NASA ISS imagery (iss007e15177), labeled honestly — matched Landsat dry/wet production pairs can replace later.  
3. **DFD research package** was not present in-repo; scientific claims follow restrained public-domain / commonly cited ranges + explicit caution asides.  
4. **Primary nav unchanged** — DFD is reachable via destination URL + Articles cross-link (not a new top-nav peer).  
5. **Video play analytics** are best-effort without the YouTube IFrame API.  
6. Diagrams also kept as SVG sources; pages use PNG renders for reliable display.

### Build / test results

```text
node automation/test-deep-forest-dispatch.mjs   → passed
node scripts/dfd/render-stories.mjs             → rendered 2 stories
CI: DFD test step added to .github/workflows/ci.yml
No Dashboard / Scenes / Sheds redesign
```

Typecheck/lint: not configured as a separate toolchain for this static site (no TypeScript app build). Production validation path remains existing Node automation + Pages static hosting.

### Owner decisions requested

1. Approve library destination + two stories for merge/publish.  
2. Provide public YouTube IDs when ready (or confirm remain null).  
3. Optional: replace educational wet/dry pair with final Landsat matched assets.  
4. Confirm whether DFD should later appear in primary nav or remain linked from Articles / Home deepeners only.
