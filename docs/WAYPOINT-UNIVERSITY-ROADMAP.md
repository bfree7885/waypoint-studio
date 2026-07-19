# Waypoint University — Roadmap & Technical Debt

## Completed

### Work block 1 — Foundation
Local-first IndexedDB OS, Markdown, capture, paths, basic links, privacy isolation.

### Work block 2 — Knowledge graph & learning workspace
Neighborhood graph, learning dashboard, knowledge health, research workflow, sources, richer questions/search/projects.

### Work block 3 — Learning engine
Understanding Map, learning profile, gaps-as-opportunities, next steps with why, cross-disciplinary bridges, timeline, project intelligence, reading annotations, research-assist search.

### Module 4 — Scholar (research environment)
Research workspaces, sessions, field notes, source reliability, project research hubs, thinking-tool foundations. Primary “ideas begin here” surface.

---

## Recommended next modules

### Module 5 — Capture depth & thinking canvases
1. Media blobs on field notes / sources (images, audio)  
2. Full backup including media  
3. Session link pickers (questions, concepts, sources)  
4. Hypothesis board + decision journal review  
5. Scholar command palette (session / field / search)  
6. Optional GPS / place assist for field notes  

### Module 6 — Scale & craft
1. Worker-built search + incremental graph/insights  
2. Virtualized library  
3. Duplicate merge + revision restore  
4. Calm whole-graph overview  

### Module 7 — Review (only when ready)
1. Optional private spaced repetition  
2. No social / no leaderboards  

### Explicitly later / maybe never
- AI tutoring  
- Public sharing / classrooms / certificates  
- Multi-user sync (if ever: E2E encrypted)

---

## Technical debt (honest)

| Item | Severity | Notes |
|------|----------|-------|
| Nav density | Med | Scholar-first collapse later |
| session.*Ids unused in UI | Low | Module 5 pickers |
| Thinking stubs ≠ canvases | By design | Module 5 |
| Export omits media | High for V1.0 | Module 5 |
| No automated browser tests | Medium | Smoke under `private/` |

---

## Version 1.0 bar (proposed)

- Instant feel at ≥5k nodes  
- Media + complete backup  
- Scholar sessions + field capture habitual  
- Neighborhood **and** calm overview graph  
- Merge + revision restore  
- Zero public-suite leakage  

Module 4 makes University feel like a **private research laboratory**; media and deeper thinking canvases remain for Module 5 / V1.0.
