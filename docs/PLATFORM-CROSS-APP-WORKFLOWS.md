# Cross-App Workflow Report

**Date:** 2026-07-18  
**Runtime:** `WDS.platformWorkflows`

---

## Principles

1. Only connect flows that a careful user would naturally want.  
2. Offer a calm link — never auto-redirect.  
3. Explain **why** in honesty text.  
4. Depth-aware hrefs for root vs `/apps/*` pages.

---

## Shipped workflows

| ID | From → To | Why |
|---|---|---|
| `photo-coach-to-fieldry` | Photo Coach → Fieldry | Looking carefully becomes an observation |
| `fieldry-to-scenes` | Fieldry → Scenes | Encounters inspire photography |
| `sheds-to-fieldry` | Sheds → Fieldry | Sign notes belong on a life list |
| `foragecast-to-fieldry` | ForageCast → Fieldry | Seasonal cues + private vouchers |
| `dashboard-to-any` | Dashboard → Studio | Hub to directory |
| `signalterrain-to-dashboard` | SignalTerrain → Dashboard | Signal literacy beside outdoor context |
| `volunteer-to-fieldry` | Volunteer → Fieldry | Stewardship in personal history |
| `savant-to-places` | Savant → Studio places | Vineyard sites as shared places |
| `steepleaf-to-collections` | Steepleaf → Studio collections | One collection system |
| `fieldry-to-sheds` | Fieldry → Sheds | Cervid notes ↔ winter field craft |
| `fieldry-to-foragecast` | Fieldry → ForageCast | Flora/fungi ↔ seasonal education |

---

## Where links render today

| Surface | Workflow filter |
|---|---|
| ForageCast Settings | `after-conditions` |
| Fieldry Home | `after-save` |
| Sheds Home | `after-observation` |
| Savant Settings | `settings` |

Photo Coach / Volunteer / SignalTerrain workflows are defined and ready; UI hooks can land when those surfaces next touch settings/home.

---

## Intentionally not connected

- Auto-creating Fieldry observations from Sheds (user must choose)  
- Pushing SignalTerrain threats into outdoor widgets (different honesty domain)  
- Merging Savant cellar into Fieldry (different domain objects)  
- Social “share to friends” anywhere
