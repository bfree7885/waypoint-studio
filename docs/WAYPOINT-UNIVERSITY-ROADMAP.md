# Waypoint University — Roadmap & Technical Debt

## Completed

### Work block 1 — Foundation
Local-first IndexedDB OS, Markdown, capture, paths, basic links, privacy isolation.

### Work block 2 — Knowledge graph & learning workspace
Neighborhood graph, learning dashboard, knowledge health, research workflow, sources, richer questions/search/projects.

### Work block 3 — Learning engine
Understanding Map, learning profile, gaps-as-opportunities, next steps with why, cross-disciplinary bridges, timeline, project intelligence, reading annotations, research-assist search. Cached insights. No grades / social / gamification.

---

## Recommended next work blocks

### Work block 4 — Capture & media
1. Drag-drop images / PDF attach (IDB blobs)  
2. Full backup including media  
3. Voice capture → audio + transcript placeholder  
4. OCR / text-extract hooks  
5. Optional page-anchored PDF annotation (builds on annotation model)

### Work block 5 — Scale & craft
1. Worker-built search + incremental graph/insights index  
2. Virtualized library / link picker search-select  
3. Duplicate merge assistant  
4. Revision restore UI  
5. Optional whole-graph overview (clustered, not hairball)

### Work block 6 — Review (only when ready)
1. Enable `review` scheduling UI  
2. Spaced repetition — private, optional  
3. No social / no leaderboards  

### Explicitly later / maybe never
- AI tutoring  
- Public sharing / classrooms / certificates  
- Multi-user sync (if ever: E2E encrypted, owner-controlled)

---

## Technical debt (honest)

| Item | Severity | Notes |
|------|----------|-------|
| Insights full rebuild on fingerprint change | Low–Med | Fine to mid thousands; workerize later |
| Bridge cross-link scan capped | By design | Avoid O(n²) blowups |
| Library lists capped ~250 | Medium | Virtualize |
| Export omits media blobs | Medium | Block 4 |
| No automated browser tests | Medium | Add smoke under `private/` |
| Annotation UI is note-based, not overlay | By design | Schema ready for anchors |

---

## Version 1.0 bar (proposed)

- Instant feel at ≥5k nodes  
- Media + complete backup  
- Neighborhood **and** calm overview graph  
- Merge + revision restore  
- Zero public-suite leakage  
- Learning companion behaviors stable (Blocks 2–3)

Block 3 clears the “lifelong intellectual companion” bar for understanding and next steps; media/scale/polish remain for V1.0.
