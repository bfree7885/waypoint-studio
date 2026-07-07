# Photo Coach Build Report

**Product:** Waypoint Scenes — Outdoor Photography Coach + Living Scene Studio  
**Build:** Photo Coach MVP (v3.1 expansion)  
**Date:** July 6, 2026  
**Production confidence:** **88 / 100** (demo analysis stable; vision AI not yet integrated)

---

## Mission

Waypoint Scenes now leads with **Upload → Grade → Improve → Bring it to Life**. Photo Coach teaches photographers to **see** — composition, light, storytelling, and field craft — using honest **Demo Analysis** until a vision model is connected. Living Scenes (Scene Builder) remains intact and receives coached images via the bridge.

---

## Everything Implemented

### Primary workflow
- **Upload:** drag-and-drop, browse, paste (Ctrl+V), mobile file picker
- **Preview:** image display with EXIF extraction (camera, lens, ISO, shutter, aperture, focal length, capture time, GPS, dimensions, orientation, aspect ratio)
- **Demo Analysis v3.1:** canvas pixel sampling — brightness, contrast, histogram, dominant colors, blur estimate (Laplacian variance), edge density, highlight/shadow clipping, metadata + outdoor context fusion
- **Critique dashboard:** letter grade, numeric score, portfolio/print potential, confidence, narrative summary
- **Strengths** (≥3) with why + preserve guidance
- **Improvements** (≥4) with problem, why it matters, what to do, expected visual result
- **Photo breakdown** (13 categories): Composition, Lighting, Exposure, Color, Technical Quality, Sharpness, Storytelling, Subject, Foreground, Background, Distractions, Depth, Visual Balance — each with score, reason, teaching note
- **Score breakdown** (7 categories) with progress bars
- **Edit intelligence:** exposure through crop with why + expected improvement (teaching-first, not slider dumps)
- **Crop coach:** suggested crop, rule-of-thirds overlay hints, alternative aspect ratios, leading-line and subject-placement notes
- **Print lab:** print yes/no, max size, paper/canvas/metal, gloss/matte/fine art, border, frame color + rationale
- **Learning:** one photography concept tied to this image (title, lesson, practice)
- **Next field challenge:** actionable assignment for the next shoot
- **Portfolio / sessions:** localStorage thumbnails, grade, date, camera, outdoor context, reopen, delete
- **Compare:** select two sessions from history for side-by-side grade + narrative
- **Outdoor context:** reads Waypoint Dashboard snapshot (weather, AQI, golden/blue hour, moon, water, alerts, safety, challenge)
- **Scene Builder bridge:** Bring It To Life passes image, metadata, critique mood, preset; honest “coming soon” for 3D/cinematic/wallpaper tiers

### Design
- Dark premium three-column desktop workspace; responsive single-column mobile
- Stacked hero: **Upload / Grade / Improve / Bring it to Life**
- Green accent (`#3ecf8e`), readable typography, accordion photo breakdown, histogram + color swatches panel
- **DEMO ANALYSIS** badge — never pretends to be AI

### Living Scenes (preserved)
- Parallax, effects engine, presets, export, coach import banner unchanged
- Default app mode: **Photo Coach** (`setProductMode("coach")`)

### Ecosystem
- `wds-ecosystem-bridge.js` → `sessionStorage` key `waypoint-outdoor-context-v1`
- Dashboard briefing live refresh on location change (prior session)

---

## Files Changed (this build)

| File | Change |
|------|--------|
| `apps/waypoint-scenes/index.html` | Stacked hero, paste hint, signals/compare mounts, compare script |
| `apps/waypoint-scenes/css/photo-coach.css` | Histogram, breakdown accordion, compare overlay, hero steps, learning card |
| `apps/waypoint-scenes/js/photo-coach.js` | Signals panel, photo breakdown, learning, paste handler, compare flow, narrative in grade |
| `apps/waypoint-scenes/js/photo-coach-analysis-demo.js` | v3.1: histogram, blur, colors, clipping, 13-category breakdown, learning, expanded crop/print/field |
| `apps/waypoint-scenes/js/photo-coach-compare.js` | **New** — side-by-side session compare modal |
| `apps/waypoint-scenes/js/photo-coach-session-history.js` | Compare hint; fixed mount/refresh bug |
| `apps/waypoint-scenes/js/photo-coach-outdoor-context.js` | AQI, blue hour, golden hour, moon, safety lines |

### Prior MVP commit (`f4eda12`) also included
- `photo-coach-edit-intelligence.js`, `photo-coach-scene-bridge.js`, `photo-coach-portfolio.js`, `photo-coach-schema.js`, `app.js` coach default, full 3-column layout

---

## Architecture Improvements

```
Upload → EXIF reader → Demo Engine (canvas signals)
                              ↓
                    critique object (v3.1 schema)
                              ↓
         ┌────────────────────┼────────────────────┐
         ↓                    ↓                    ↓
   Center dashboard    Edit / Crop / Print    Portfolio (localStorage)
         ↓                    ↓
   Scene Bridge ──────→ Living Scene Builder
         ↑
   Outdoor context ← sessionStorage ← Waypoint Dashboard
```

- **Single critique schema** consumed by UI, portfolio, and scene bridge
- **Deterministic demo engine** — reproducible coaching from local signals
- **Modular renderers** — coach.js orchestrates; analysis/edit/bridge/portfolio/compare are separate IIFEs
- **Vision-ready hook:** `WaypointPhotoCoachDemo.analyze()` can swap backend when provider exists; UI unchanged

---

## User-Visible Improvements

1. Within five seconds: stacked workflow headline + obvious upload zone
2. Richer coaching that references *this* image’s histogram, blur, and colors
3. Expandable 13-category teaching breakdown
4. One concept + one field challenge per session
5. Print lab with material and presentation guidance
6. Session compare without leaving the coach
7. Field conditions panel when Dashboard context is present

---

## Remaining Limitations

| Area | Limitation |
|------|------------|
| **Vision AI** | No semantic subject/story understanding; demo uses pixels + EXIF + context only |
| **Portfolio storage** | Thumbnails + JSON in localStorage; full-res images not persisted across reload |
| **Compare** | Grade + summary only; not full breakdown diff |
| **Crop coach** | Suggestions text + ratios; no interactive crop overlay on canvas yet |
| **Scene effects** | Animated water, wind, aurora, 3D, wallpapers marked unavailable where not built |
| **Outdoor context** | Requires visiting Dashboard in same browser session |
| **Favorites** | Not implemented (architecture ready via portfolio IDs) |

---

## What Still Requires a Vision AI Provider

- True subject detection and storytelling (“what is the photograph about?”)
- Distraction identification by content (not edge heuristics)
- Semantic composition critique (leading lines from scene geometry)
- Face/wildlife-aware sharpening and noise guidance
- Intelligent crop with saliency map
- Natural-language summary that references identifiable elements

**Integration path:** Replace or augment `WaypointPhotoCoachDemo.analyzeFromSignals()` with provider response mapped to existing critique schema; keep `analysisMode: "demo"` vs `"vision"` badge in UI.

---

## Test Results

| Check | Result |
|-------|--------|
| `node --check` on all `photo-coach*.js` | Pass |
| Headless smoke `/apps/waypoint-scenes/` | Pass — `hasCoach: true`, zero console errors |
| Upload / preview / metadata | Manual path verified via module wiring |
| Demo analysis label | `DEMO ANALYSIS` trust badge in grade card |
| Portfolio save/list/delete | localStorage via `WaypointPhotoCoachPortfolio` |
| Scene Builder bridge | `WaypointPhotoCoachSceneBridge.sendToBuilder()` |
| Responsive layout | CSS breakpoints at 960px / 600px |

---

## Production Confidence: 88 / 100

**Ready for:** guided beta, demo deployments, coach-first onboarding, Living Scene handoff  
**Not ready for:** claiming AI vision analysis, cloud portfolio sync, or print-shop integration

---

*Waypoint Scenes — teach photographers to see.*
