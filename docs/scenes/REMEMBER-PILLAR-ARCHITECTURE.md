# Remember Pillar — Architecture

**Status:** Foundation scaffold (not full product)  
**Branch:** `feature/scenes-remember-pillar-foundation`  
**Base:** `origin/main` @ `59c09debbe8d9c7d36acf74607bd4ebfa55359fc`  
**Canonical hub:** `/apps/scenes/remember/`

---

## Purpose

The **Remember** pillar turns photographs and field noticing into lasting **private** records: journals, calendars, and books.

This sprint ships a **reusable framework only**:

- Navigation into Remember
- Shared document / artifact data model
- Print pipeline foundation (stubs + browser print hooks)
- Placeholder pages for each Remember type

Explicitly **out of scope:** full journal UX, complete PDF book generation, AI, cloud sync.

---

## Placement in Scenes

Production Scenes hub remains `/apps/scenes/`. Remember is a peer module under that hub (same pattern as Living Scenes), not a Dashboard surface.

```
Scenes home (/apps/scenes/)
  ├── Photo Coach / Shoot Review     ← craft (Learn-adjacent, live)
  ├── Photo Library                  ← catalog (live)
  ├── Hidden Landscapes              ← explore (live/experimental)
  ├── Remember / Outdoor Journals    ← this pillar (foundation)
  │     ├── Hiking Journals
  │     ├── Wildlife Journals
  │     ├── Mushroom Journals
  │     ├── Year in Nature
  │     ├── Calendars
  │     └── Books
  ├── Living Scenes                  ← create (future)
  └── Photographer Profile           ← optional share
```

**Legacy alias:** `/apps/waypoint-scenes/remember/` redirects to `/apps/scenes/remember/` (compat with Sprint 1 four-pillar stub path).

---

## Route table

| Route | Role | Maturity |
|-------|------|----------|
| `/apps/scenes/remember/` | Outdoor Journals hub | Foundation |
| `/apps/scenes/remember/hiking-journals/` | Hiking Journals placeholder | Foundation |
| `/apps/scenes/remember/wildlife-journals/` | Wildlife Journals placeholder | Foundation |
| `/apps/scenes/remember/mushroom-journals/` | Mushroom Journals placeholder | Foundation |
| `/apps/scenes/remember/year-in-nature/` | Year in Nature placeholder | Foundation |
| `/apps/scenes/remember/calendars/` | Calendars placeholder | Foundation |
| `/apps/scenes/remember/books/` | Books placeholder | Foundation |
| `/apps/waypoint-scenes/remember/` | Redirect → scenes Remember hub | Alias |

---

## Shared data model

**Source of truth:** `apps/scenes/remember/js/remember-model.js`  
**Catalog:** `apps/scenes/remember/data/remember-catalog.json`

### Artifact types

`outdoor-journal` · `hiking-journal` · `wildlife-journal` · `mushroom-journal` · `year-in-nature` · `calendar` · `book`

### `RememberDocument` (v1)

| Field | Meaning |
|-------|---------|
| `id` | Local document id |
| `schemaVersion` | `1.0.0` |
| `type` | Artifact type above |
| `title` | Human title |
| `status` | `draft` \| `ready` \| `archived` |
| `photoRefs[]` | Local / library refs only (no cloud assumption) |
| `sections[]` | Ordered `{ id, title, body?, photoRefs? }` |
| `print` | `{ format, orientation, includeCaptions? }` |
| `meta` | Extensible bag for later domain fields |

Storage helper key (optional local drafts): `waypoint-scenes-remember-docs-v1`.

Privacy default: **local-first**. No upload APIs in this foundation.

---

## Print pipeline (foundation)

**Source:** `apps/scenes/remember/js/remember-print.js`

| API | Behavior now |
|-----|----------------|
| `createPrintJob(doc)` | Builds a `RememberPrintJob` with page estimate |
| `renderPrintPreviewHtml(doc)` | Plain print-ready HTML shell |
| `requestPrint(doc)` | Opens browser print via ephemeral iframe when available |
| `exportPdfStub(doc)` | Returns `{ ok: false, implemented: false, … }` deliberately |

No book designer, no imposition, no commercial print vendor integration.

---

## Engine boundary

`apps/scenes/js/engines/remember-engine.js` exposes `RememberEngine` on `WaypointScenesEngines` and is listed in `registry.js`. Interface-only facade over model + print stubs.

---

## Navigation

- Scenes hub **Later** list links to `remember/`
- `wds-app-nav-config.js` Scenes features: `remember` → `apps/scenes/remember/`
- `nav-registry.json` synced with the same feature id
- Dashboard product surfaces are **not** redesigned; shared Scenes nav only

---

## Relationship to prior work

| Source | What we took |
|--------|----------------|
| `origin/main` @ `59c09de` | Integration base (production tip) |
| Sprint 1 (`feature/scenes-sprint1-four-pillar-foundation`) | Intent for Outdoor Journals under REMEMBER; single stub under `waypoint-scenes/remember/` — **not** merged wholesale |
| Learn / Scenes reconciliation | Not started as a branch; left alone |

---

## Next integration steps (not this sprint)

1. Draft editor for one journal type (hiking recommended)
2. Wire `photoRefs` to Photo Library keepers
3. Real PDF export behind the existing stub API
4. Calendar layout templates
5. Reconcile Learn pillar workflow separately without blocking Remember
