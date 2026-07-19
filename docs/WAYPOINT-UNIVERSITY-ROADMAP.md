# Waypoint University — Roadmap & Technical Debt

## Completed

### Work block 1 — Foundation
Local-first IndexedDB OS, Markdown, capture, paths, basic links, privacy isolation.

### Work block 2 — Knowledge graph & learning workspace
Neighborhood graph, learning dashboard, knowledge health, research workflow, sources, richer questions/search/projects.

---

## Recommended next work blocks

### Work block 3 — Capture & media
1. Drag-drop images / PDF attach (IDB blobs)  
2. Full backup including media  
3. Voice capture → audio + transcript placeholder  
4. OCR / text-extract hooks  

### Work block 4 — Scale & craft
1. Worker-built search + incremental graph index  
2. Virtualized library / link picker search-select  
3. Duplicate merge assistant  
4. Revision restore UI  
5. Optional whole-graph overview (clustered, not hairball)

### Work block 5 — Review (only when ready)
1. Enable `review` scheduling UI  
2. Spaced repetition — private, optional  
3. No social / no leaderboards  

### Explicitly later / maybe never
- AI tutoring  
- Public sharing  
- Multi-user sync (if ever: E2E encrypted, owner-controlled)

---

## Technical debt (honest)

| Item | Severity | Notes |
|------|----------|-------|
| Related-search scans tags across corpus | Med | Fine to ~few thousand; optimize later |
| Graph capped at 36 nodes | By design | Overview mode still needed |
| Library lists capped ~250 | Medium | Virtualize |
| Export omits media blobs | Medium | Block 3 |
| No automated browser tests | Medium | Add smoke under `private/` |
| Math still placeholder spans | Low | Optional KaTeX later |

---

## Version 1.0 bar (proposed)

- Instant feel at ≥5k nodes  
- Media + complete backup  
- Neighborhood **and** calm overview graph  
- Merge + revision restore  
- Zero public-suite leakage  

Block 2 clears the “research environment” bar; media/scale/polish remain for V1.0.
