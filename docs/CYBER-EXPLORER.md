# Cyber Intelligence Explorer

**Status:** Architecture V0.1  
**UI:** `apps/signalterrain/cyber/explorer.html`  
**Runtime:** `design-system/js/signalterrain/wds-signalterrain-cyber-explorer.js`  
**Package:** `design-system/signalterrain/intelligence/cyber/explorer/`

---

## Mission

Let users explore the cybersecurity landscape through **relationships, timelines, geography, and context** — not another list dashboard or news feed.

Questions answered:

- What is happening?
- Where is it happening? (coarse awareness only)
- Who is affected?
- How are events related?
- What changed?
- What should I learn next?

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  explorer.html  (calm exploration chrome)   │
└─────────────────────┬───────────────────────┘
                      │ mountExplorer()
┌─────────────────────▼───────────────────────┐
│  wds-signalterrain-cyber-explorer.js        │
│  panels · filters · product/campaign pages  │
│  explainEdge · timeline window · map SVG    │
└───────┬──────────────────────────┬──────────┘
        │                          │
        ▼                          ▼
 cyber-graph.js              research.js
 neighbors / findPath /      bookmarks / notes /
 traverseAttentionChain      collections / cache
        │                          │
        ▼                          ▼
 cyber-intelligence.sample   research-workspace.sample
 map-layers.json (lazy)      localStorage (on-device)
```

**Rule:** The explorer **consumes** the shared cyber graph. It does **not** re-implement path finding, attention chains, or relationship catalogs.

---

## Navigation

| Panel | Role |
|-------|------|
| Overview | Orientation + sample attention chain |
| Relationship Graph | Incremental expand + edge explanations |
| Timeline | Filtered, windowed milestones |
| World Map | Independent educational layers |
| Organizations | Sources / advisory publishers |
| Products | Software/hardware → product detail |
| Vulnerabilities | CVE / vulnerability / KEV literacy |
| Threat Campaigns | Campaign detail pages |
| Research | Shared workspace items |
| Saved Collections | Collections + explorer saves |

Deep links: `#product/{id}`, `#campaign/{id}`, `#entity/{id}`.

---

## Related docs

- [CYBER-GRAPH-UI.md](CYBER-GRAPH-UI.md)
- [CYBER-TIMELINE.md](CYBER-TIMELINE.md)
- [CYBER-MAP.md](CYBER-MAP.md)
- [CYBER-GRAPH-ARCHITECTURE.md](CYBER-GRAPH-ARCHITECTURE.md)
