# Homepage Side Trails section — owner review

**Date:** 2026-08-07  
**Branch:** `feature/homepage-side-trails-section`  
**Worktree:** `/home/bryan/Projects/waypoint-studio-home-side-trails`  
**Base:** `origin/main`  
**Recommendation:** **Do not merge** until owner visual review (desktop + mobile).

---

## Goal

Make Side Trails visible from the current Waypoint Studio homepage (Rebuild Home), below Scenes/Sheds and before the app-shell footer — without redesigning Home or turning Side Trails into a second flagship catalog.

---

## What changed

| Area | Change |
| --- | --- |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js` | Append Side Trails teaser after Sheds |
| `design-system/css/wds-dashboard-rebuild.css` | Lighter card styles for the teaser only |
| `automation/test-home-rc1.mjs` | Contract checks for title, subtitle, destinations, placement |
| This doc | Owner review notes |

**Not changed:** Side Trails catalog page, Global Signals app, homepage hero/workspace widgets, primary nav IA.

---

## Card destinations

| Card | Status | Opens |
| --- | --- | --- |
| Civic Trails | Beta | `https://github.com/bfree7885/civic-trails` (canonical outlink) |
| SignalTerrain | Experimental | `/apps/signalterrain/` (working application) |
| Global Signals | Experimental | `/side-trails/global-signals/` (GS surface at that route) |
| View all Side Trails → | — | `/side-trails/` |

Copy: **Title** “Side Trails” · **Subtitle** “Experimental projects, research, and useful detours.”

---

## UX notes

- Visually quieter than Scenes/Sheds panels (dashed divider, muted title, transparent cards, smaller icons).
- Desktop: three-column grid; mobile: stacked rows.
- No engagement farming, urgency, or equal-weight “second catalog” presentation.

---

## Tests

```bash
cd /home/bryan/Projects/waypoint-studio-home-side-trails
node automation/test-home-rc1.mjs
node automation/test-side-trails.mjs
node automation/test-signalterrain-side-trails-move.mjs
```

All three passed in this worktree.

---

## Screenshots

See `docs/releases/homepage-side-trails-section/` (desktop + mobile captures of the below-fold Side Trails block).

---

## Owner checklist

- [ ] Section appears after Sheds, before footer
- [ ] Three cards + View all destinations correct
- [ ] Visually lighter than Scenes/Sheds (not competing as flagship)
- [ ] Mobile layout readable; tap targets OK
- [ ] Approve or request tweaks — **do not merge until review**
