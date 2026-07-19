# Waypoint University — Roadmap & Technical Debt

## Completed

### Work block 1 — Foundation
Local-first IndexedDB OS, Markdown, capture, paths, basic links, privacy isolation.

### Work block 2 — Knowledge graph & learning workspace
Neighborhood graph, learning dashboard, knowledge health, research workflow, sources, richer questions/search/projects.

### Work block 3 — Learning engine
Understanding Map, learning profile, gaps-as-opportunities, next steps with why, cross-disciplinary bridges, timeline, project intelligence, reading annotations, research-assist search.

### Module 4 — Scholar (research environment)
Research workspaces, sessions, field notes, source reliability, project research hubs, thinking-tool foundations.

### Module 5 — Private access & daily use
Loopback owner authentication, daily home workspace, journal, path entry management, editor drafts/preview, JSON+Markdown export. Exact access: `private/university/ACCESS.md`. Remote subdomain deferred.

---

## Recommended next modules

### Module 6 — Capture depth & remote private host
1. Media blobs + full backup  
2. DNS/TLS private host or Tailscale/Cloudflare Access for `university.waypointstudio.org`  
3. Session link pickers  
4. Hypothesis / decision canvases  

### Module 7 — Scale & craft
1. Worker-built search + incremental graph/insights  
2. Virtualized library  
3. Duplicate merge + revision restore  
4. Calm whole-graph overview  

### Module 8 — Review (only when ready)
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
| Knowledge in browser IDB | By design | Export often |
| No remote private subdomain | High for travel | Needs host ≠ Pages |
| Media omitted from export | High for V1.0 | Module 6 |
| Automated browser IDB E2E | Medium | Manual journey after setup |
| Thinking stubs ≠ canvases | By design | Module 6 |

---

## Version 1.0 bar (proposed)

- Instant feel at ≥5k nodes  
- Media + complete backup  
- Private remote access option (authenticated)  
- Neighborhood **and** calm overview graph  
- Merge + revision restore  
- Zero public-suite leakage  

Module 5 makes University **usable today on the owner machine** with real auth and persistence.
