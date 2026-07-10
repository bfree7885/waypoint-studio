# Waypoint Photo Coach — Architecture

Phase 1 foundation for a long-horizon outdoor photography learning instrument.

## Purpose

Photo Coach helps a beginner photographer learn to **see** — not chase social metrics. It combines live outdoor intelligence with curated field guidance for composition, editing philosophy, gear, and quiet progress tracking.

This is separate from **Waypoint Scenes** (`apps/waypoint-scenes/`), which focuses on upload, critique demo, and scene animation. Photo Coach is the **journey instrument**; Scenes remains the **creative studio**.

## Folder structure

```
apps/photo-coach/
├── index.html                 # App shell, WDS platform scripts
├── css/
│   └── photo-coach-journey.css
├── js/
│   ├── photo-coach-boot.js    # Location + OIP bootstrap (Fieldry pattern)
│   ├── photo-coach-app.js     # Section rendering, concept navigation
│   ├── photo-coach-content.js # Curated concepts, checklist, editing, gear
│   ├── photo-coach-conditions.js
│   ├── photo-coach-opportunities.js
│   ├── photo-coach-progress.js
│   └── photo-coach-util.js
├── data/
│   └── preview.json
└── docs/
    └── ARCHITECTURE.md
```

## Reused platform components

| Component | Path | Role |
|-----------|------|------|
| WDS Platform loader | `design-system/js/wds-platform.js` | Location, weather, OIE |
| Sky dashboard intel | `design-system/js/weather/wds-sky-dashboard-intel.js` | Sunrise/sunset quality, fog, night |
| OIE photography rules | `design-system/js/outdoor-intelligence/wds-oie-photography-rules.js` | Live opportunity blocks |
| OIE engine | `design-system/js/outdoor-intelligence/wds-oie-engine.js` | Briefing assembly |
| Ecosystem bridge | `design-system/js/wds-ecosystem-bridge.js` | Share context with Scenes |
| Live engine (optional) | `data/live.json` → `photography_conditions` | Regional light score |
| Design system | `design-system/css/wds.css` | Typography, surfaces, tokens |

## Data flow

```
User location (WDS.location)
        ↓
WDS.outdoorIntelligence.get()
        ↓
Platform package (weather, daylight, alerts)
        ├→ skyDashboardIntel.analyze() → Conditions cards
        ├→ OIE.build() → photoFieldGuide → Opportunities
        └→ ecosystemBridge.save() → sessionStorage for Scenes

Optional: fetch data/live.json → photography_conditions module
```

## Sections (Phase 1)

1. **Today's Photography Conditions** — Live when Open-Meteo resolves; graceful unavailable copy otherwise. Milky Way / aurora explicitly marked *not yet available* (no fake forecasts).

2. **Photo Opportunities** — OIE photography rules filtered by current context, plus seasonal watchlist by calendar month.

3. **Photo Coach** — 16 composition concepts, one at a time, with inline SVG diagrams. No gamification.

4. **Field Checklist** — Pre-shutter questions with rationale.

5. **Editing Coach** — Philosophy per control (exposure, highlights, crop, etc.) — WHY not presets.

6. **Gear Knowledge** — Sony a6700 + 18–135mm and field essentials.

7. **My Progress** — `localStorage` key `waypoint-photo-coach-journey-v1`: visits, concepts viewed/studied, field sessions. No badges or streaks.

## Future roadmap

### Sprint 2 — Field journal linkage
- Link Fieldry observations to Photo Coach field sessions
- Place names from WOS records (privacy-aware)

### Sprint 3 — Image upload foundation
- Local-first image picker (no cloud account)
- Thumbnail grid in My Progress
- Store file references in IndexedDB; metadata in localStorage

### Sprint 4 — EXIF analysis
- Parse EXIF in browser (`exifr` or similar)
- Surface: focal length used, ISO, shutter, aperture histogram
- Coach copy: "You shot at 18mm — foreground interest applies"
- No fake critique — only factual EXIF + concept cross-links

### Sprint 5 — AI photo critique
- Opt-in, on-device or API-backed critique pipeline
- Input: image + EXIF + outdoor context snapshot from ecosystem bridge
- Output: structured schema (see `apps/waypoint-scenes/js/photo-coach-schema.js`)
- Principles: cite visible evidence, reference learned concepts, never invent EXIF
- Offline: queue requests; show "critique requires connection"

### Sprint 6 — Seasonal recommendations engine
- Combine phenology module, historical weather patterns, regional content engine
- Month-by-month opportunity calendar for Pike County + user lat/lng
- Integrate eBird when module is live (currently unavailable in production)

### Sprint 7 — Scenes integration
- Deep link from Photo Coach concept → Scenes with outdoor context
- Replace Scenes demo analysis with Photo Coach journey progress

## Design principles

- **Quiet, premium, nature-inspired** — WDS tokens, Cormorant + Inter
- **No placeholder content** — unavailable states explain what is missing
- **Banned UI copy** — no "coming soon", "lesson", "homework", "assignment", "educational" in user-facing text
- **No gamification** — growth metrics only
- **Accessible** — semantic sections, skip link, focus states, reduced motion

## Validation

```bash
# Local server
python3 -m http.server 8080

# Smoke (includes photo-coach)
node automation/smoke-browser.mjs http://127.0.0.1:8080

# Mobile layout (homepage, kiosk, status)
node automation/mobile-layout.mjs http://127.0.0.1:8080
```

## Related apps

- `apps/waypoint-scenes/` — critique upload, portfolio, scene builder (existing Photo Coach modules)
- `apps/fieldry/` — WOS observation ledger
- `/` — regional dashboard with photography widgets
