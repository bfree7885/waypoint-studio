# Waypoint University — Work Block 2 Report

**Date:** 2026-07-18 / 2026-07-19  
**Schema:** 1.1.0  
**Status:** Uncommitted — do not push until requested  

---

## Mission check

| Criterion | Result |
|-----------|--------|
| Connected learning environment | **Yes** — neighborhood graph + relation vocabulary |
| Discover relationships | Interactive graph + connection lists + search relatedness |
| Identify gaps | Knowledge health opportunities |
| Deeper mental model | Research workflow stages + project living maps |
| Still calm / not notebook-only | Learning dashboard home |

---

## Knowledge graph architecture

- **Index:** `WU.Graph.buildIndex(nodes, edges)` builds adjacency lists for O(degree) traversal.  
- **Neighborhood:** BFS with depth (1–3), max ~36 nodes, optional type filters.  
- **Layout:** Deterministic **radial rings** (focus center) — readable over force-directed clutter.  
- **Interaction:** Click recenters; double-click opens item; group filters by relationship family.  
- **Broken edges:** Detected when endpoints missing; surfaced in health.

### Relationship model (Block 2 additions)

Related concepts · Prerequisites · Builds upon · Contradicts · Examples · Applications · Referenced by · Questions about · Future research · Evidence · (+ Foundation set)

Grouped for filters: related · structure · application · evidence · citation · inquiry · tension.

---

## Research workflow

Optional stages on any node (`research.stage`):

1. Capture idea → 2. Collect sources → 3. Summarize → 4. Extract concepts → 5. Link → 6. Questions → 7. Conclusions → 8. Further research  

Queues: reading · research inbox · today’s focus.

---

## Sources

Kinds: book, paper, article, document, manual, video, podcast, website, course  

Fields: citation, authors, year, readingStatus, confidence — plus projects and graph links.

---

## Questions

First-class with `question.status` (open / investigating / answered / parked), confidence, evidence, resolution — linkable via Questions about / Potential answers / Evidence.

---

## Search improvements

- Citation/authors/evidence indexed  
- **Related & connected** from graph neighbors + shared tags/projects  
- **Follow-up reading** via continue-with / learn-before / future-research  
- **Recently viewed** ring (meta `recentViews`)  
- Match reasons retained  

---

## Performance

| Area | Approach |
|------|----------|
| Graph render | Cap visible nodes; SVG not canvas; no physics loop |
| Traversal | Adjacency lists rebuilt on refresh (same cadence as search index) |
| Search | In-memory; relatedness limited to top hits |
| Scale next | Worker index, incremental adj updates, virtualized library |

---

## Remaining debt / toward V1.0

- Spatial whole-graph overview (not just neighborhoods)  
- Merge tool for duplicate concepts  
- Media blobs + full backup  
- Search-as-you-type link picker beyond filter  
- Automated browser tests  
- Optional review scheduling UI (fields exist)

---

## Files

```
private/university/js/wu-schema.js      — 1.1.0 vocabulary
private/university/js/wu-store.js       — question/source/research/queue + recentViews
private/university/js/wu-graph.js       — NEW
private/university/js/wu-health.js      — NEW
private/university/js/wu-search.js      — related/follow-ups
private/university/js/wu-app.js         — dashboard, graph, health, research, sources
private/university/css/wu.css           — graph/health styles
private/university/index.html           — script tags
docs/WAYPOINT-UNIVERSITY-BLOCK2.md
docs/WAYPOINT-UNIVERSITY-BLOCK2-CHANGELOG.md
docs/WAYPOINT-UNIVERSITY-ROADMAP.md     — updated
```
