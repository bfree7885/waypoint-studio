# Sheds Experience Redesign V1

**Date:** 2026-07-15  
**Type:** Industrial design + interaction redesign (not a feature sprint)  
**Evidence:** `reports/sheds-experience-redesign-v1/`  
**Field system:** `docs/WAYPOINT-FIELD-DESIGN-SYSTEM.md`

---

## Mission

Redesign Sheds so the first second communicates:

> I know where I am.  
> I know what the app is recommending.  
> I understand why.  
> I know what to do next if I choose.

The map is the product. The interface disappears.

---

## Primary story

```text
YOU ARE HERE
     ↓
TODAY LOOKS [favorable / worth searching / limited]
     ↓
THE BEST PLACE IS THERE (direction · distance)
     ↓
HERE IS WHY (expand)
```

---

## Major decisions

| Decision | Rationale |
|----------|-----------|
| Collapse chrome to brand + quiet context | Removes “website header” feeling; frees terrain |
| Single “You are here” chip (tap to locate) | Matches human goal, not “GPS status panel” |
| Hide tracking until active | “Not tracking” was permanent noise |
| Reduce FAB rail to Locate · Track · Tools (+ Center when needed) | Layers/Notes are Later; intention > implementation |
| Icon-only FABs | Labels competed with map; aria-labels remain |
| Conversational story sheet | Replaces “Today’s Search + empty stars” developer UI |
| Plain-language confidence | Empty ☆☆☆☆☆ looked broken and game-like |
| Hide priority legend until heat exists | Legend without overlay = clutter |
| Softer map loading gradient | Gray tile voids felt broken |
| “Show on map” instead of “Go there” | Autonomy — invitation, not command |
| Tools sheet leads with Add note / Map & layers | Discoverable without permanent deck |

---

## Eye path (landing)

1. **Map terrain** (primary)
2. **Story glance** — destination / next step (serif, large)
3. **You-are-here chip**
4. **Locate FAB** (accent)
5. Everything else fades until needed

---

## Immediate / Soon / Later

| Layer | Sheds elements |
|-------|----------------|
| Immediate | Map, presence chip, story peek, Locate/Track |
| Soon | Expanded story: stats, why, coverage actions |
| Later | Tools → notes, layers, weights, history, ethics, export |

---

## Copy shifts

| Before | After |
|--------|-------|
| Today’s Search | Start here / Looking favorable nearby |
| ☆☆☆☆☆ | We’ll suggest where to look / Moderate confidence |
| Tap Locate | You · tap to place |
| Go there | Show on map |
| Loading terrain… | Reading the land… |
| Field tools | Tools — notes and layers until needed |

---

## What did not change

- Biological model, planner, heat science
- Observation / session / validation storage
- Ethics requirements and privacy honesty
- Accessibility basics (targets, focus, reduced motion)

---

## Before / after evidence

| | Before | After |
|--|--------|-------|
| Phone landing | `before/01-fresh-load-phone.png` | `after/01-fresh-load-phone.png` |
| Sheet expanded | `before/03-sheet-expanded.png` | `after/03-sheet-expanded.png` |
| Desktop | `before/05-desktop.png` | `after/05-desktop.png` |

Generated with `SHEDS_CDP=1 node automation/test-sheds-field-ux.mjs` (artifacts mirrored into redesign report folder).

---

## Remaining pain points

1. **First-run without GPS** still requires mental leap (pan/zoom) — soft coaching could improve without nagging.
2. **No drag-to-expand** sheet yet (tap only).
3. **Leaflet zoom** still visible — consider hiding on phone once pinch is taught.
4. **Destination focus** could use a stronger temporary camera cue when a plan appears.
5. **Shared Field components** not yet extracted from Sheds CSS/JS.

---

## Shared components (promote next)

See Field Design System: map shell, FAB rail, story sheet, presence chip, confidence language, tools sheet, tokens.
