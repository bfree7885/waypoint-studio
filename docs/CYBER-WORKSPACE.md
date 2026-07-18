# Cyber Operations Workspace

**Status:** V1.0 prototype  
**UI:** `apps/signalterrain/cyber/workspace.html`  
**Runtime:** `wds-signalterrain-cyber-workspace.js`  
**Package:** `design-system/signalterrain/intelligence/cyber/workspace/`

---

## What this is

A calm, personal **investigation environment** for cybersecurity literacy — a digital field notebook.

It is **not** a SOC, SIEM, or incident-response platform.

Users should always be able to answer:

- What am I looking at?
- Why does it matter?
- What have I already learned?
- What should I revisit later?

---

## Storage model (no duplicates)

| Concern | Store | Key |
|---------|-------|-----|
| Investigations, watchlists, notes, collections, queue, bookmarks, saved searches, activity | Shared research workspace | `st_research_workspace_v01` |
| Dashboard panel order / visibility | Layout prefs only | `st_cyber_workspace_layout_v01` |

All content kinds live in `WDS.signalTerrainResearch` — the same store used by Explorer and Knowledge. The workspace does **not** invent a second notes database.

Intelligence entities remain in the shared `cy_*` graph. Workspace items link via `subjectIds` / `memberIds`.

---

## Surfaces

| Hash | Purpose |
|------|---------|
| `#dashboard` | Customizable home panels |
| `#investigations` / `#investigation/:id` | Investigation notebooks |
| `#watchlists` | Explainable watches |
| `#notes` / `#notes/:id` | Markdown notes + versions |
| `#collections` / `#collections/:id` | Curated sets |
| `#queue` | Reading queue |
| `#search` | Unified search + saved searches |
| `#timeline` | Personal learning timeline |

---

## Dashboard panels

Today’s Brief · Recent intelligence · Investigations · Reading queue · Pinned topics · Collections · Personal timeline · Watchlists · Learning progress · Recent notes

Each panel is independently movable (↑/↓) and hideable. Layout persists locally.

---

## Builds on

- Cyber intelligence graph (`wds-signalterrain-cyber-graph.js`)
- Shared research runtime (`wds-signalterrain-research.js`)
- Defensive knowledge index (optional, for search + learning panel)
- Platform systems catalog: collections, bookmarks, notes, saved-searches, timeline, search

---

## Related

- [INVESTIGATIONS.md](INVESTIGATIONS.md)
- [WATCHLISTS.md](WATCHLISTS.md)
- [NOTES.md](NOTES.md)
- [COLLECTIONS.md](COLLECTIONS.md)
- [READING-QUEUE.md](READING-QUEUE.md)
- [SIGNALTERRAIN-PLATFORM-ARCHITECTURE.md](SIGNALTERRAIN-PLATFORM-ARCHITECTURE.md)
