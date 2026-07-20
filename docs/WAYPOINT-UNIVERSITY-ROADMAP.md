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

### Module 6 — Intelligent research assistant
Local Assist engine (`wu-assist.js`), related-on-open, knowledge opportunities, companion/memory hints, decision journal, hypothesis tracking, domain dashboards, writing workspace, multi-note compare, source synthesis, NL search, privacy toggles. Schema **1.5.0**. Docs: `WAYPOINT-UNIVERSITY-BLOCK6.md`.

---

## Recommended next modules

### Module 7 — Capture depth & remote private host
1. Media blobs + full backup  
2. DNS/TLS private host or Tailscale/Cloudflare Access for `university.waypointstudio.org`  
3. Session link pickers / citation insert into Write  
4. Decision review-date reminders  

### Module 8 — Scale & craft
1. Worker-built search + incremental graph/insights  
2. Optional local embeddings / on-device LLM behind the same Known–Unknown contract  
3. Virtualized library  
4. Duplicate merge + revision restore  
5. Calm whole-graph overview  

### Module 9 — Review (only when ready)
1. Optional private spaced repetition  
2. No social / no leaderboards  

### Explicitly later / maybe never
- Cloud tutoring that uploads the library  
- Public sharing / classrooms / certificates  
- Multi-user sync (if ever: E2E encrypted)

---

## Technical debt (honest)

| Item | Severity | Notes |
|------|----------|-------|
| Knowledge in browser IDB | By design | Export often |
| No remote private subdomain | High for travel | Needs host ≠ Pages |
| Media omitted from export | High for V1.0 | Module 7 |
| Lexical relatedness O(n) | Medium at scale | Module 8 workers/embeddings |
| No on-device LLM yet | Medium | Heuristics only; privacy-preserving path designed |
| Citation insert UX | Low | Architecture only in Write |
| Automated browser IDB E2E | Medium | Manual journey after setup |
| Concept/argument canvases | Low | Still stubs |

---

## Version 1.0 bar (proposed)

- Instant feel at ≥5k nodes  
- Media + complete backup  
- Private remote access option (authenticated)  
- Neighborhood **and** calm overview graph  
- Merge + revision restore  
- Zero public-suite leakage  
- Research assistant remains local-first with explicit remote opt-in  

Module 6 makes Scholar a **grounded research partner on the owner machine**. University V1.0 still needs media, remote private access, and scale work.
