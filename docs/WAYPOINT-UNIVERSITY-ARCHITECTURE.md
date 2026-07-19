# Waypoint University — Architecture

**Status:** Private · local-first · Work Block 2 (knowledge graph & learning workspace)  
**Location:** `private/university/`  
**Schema:** `1.1.0`  
**Commit policy:** Owner review — do not treat as public product

---

## What this is

A **private research and learning environment** for one lifelong learner. It is not:

- A public Waypoint Studio product  
- A social network  
- A marketplace  
- A generic notes dump  

It helps discover relationships between ideas, notice gaps, and navigate an interconnected body of knowledge.

---

## Isolation from the public suite

| Control | Implementation |
|---------|----------------|
| No nav / catalog / registry entry | Omitted by design |
| No sitemap / marketing links | Omitted by design |
| `robots.txt` | `Disallow: /private/` |
| HTML | `noindex, nofollow` |
| GitHub Pages | `private/` removed before artifact upload |
| Data | IndexedDB on the owner’s browser profile |

Open locally: `private/university/index.html` (any static server or `file://` with IndexedDB-capable browser).

---

## Runtime architecture

```
index.html
  ├── wu-schema.js     kinds, relations, sources, research stages (1.1.0)
  ├── wu-store.js      IndexedDB: nodes, edges, media, meta, revisions
  ├── wu-search.js     inverted index + reasons + related/follow-ups
  ├── wu-markdown.js   Markdown render
  ├── wu-graph.js      adjacency index, BFS neighborhood, radial SVG
  ├── wu-health.js     knowledge-health opportunities
  └── wu-app.js        hash SPA: learning dashboard, graph, research, …
```

No dependency on `WDS.appShell` / Apps launcher — intentional.

---

## Storage (local-first)

**Database:** `waypoint-university-v1` (IndexedDB)

| Store | Purpose |
|-------|---------|
| `nodes` | Knowledge objects (+ question / source / research / queue) |
| `edges` | Relationships |
| `media` | Blob metadata + future binary payloads |
| `meta` | Bootstrap flags, `recentViews`, settings |
| `revisions` | Snapshot hooks on save |

---

## Graph engine (Block 2)

- **Adjacency lists** rebuilt with search index on refresh  
- **Tag / project inverted indexes** for O(hits) relatedness (not O(corpus) scans)  
- **BFS neighborhoods** depth 1–3, capped (~36 nodes) for readability  
- **Radial layout** — focus center, rings by depth — no force-directed clutter  
- Interaction: click recenter · double-click open · filter by relation group  

See `docs/WAYPOINT-UNIVERSITY-BLOCK2.md` for workflow, health, and performance notes.

---

## Work blocks

| Block | Theme |
|-------|--------|
| 1 | Foundation OS |
| 2 | Graph + learning workspace *(current)* |
| 3+ | Media, scale, optional review — see roadmap |

**Export:** JSON bundle of nodes + edges. Media blobs reserved for a later full backup format.

---

## Performance stance

- Startup: open DB + list nodes/edges + build search + graph indexes once  
- Navigation: hash SPA, no network on critical path  
- Search: O(terms × postings) in memory; relatedness via adj + tag/project indexes  
- Graph: capped neighborhood SVG (no physics loop)  
- Future: worker-built index, virtualized library, optional clustered overview  

---

## Deferred by design (hooks present)

- Spaced repetition / flashcards / quizzes — `node.review` fields ready  
- AI tutoring — not implemented  
- Public sharing — never intended  
- Voice / OCR — `MEDIA_KINDS` future flags  

---

## Related docs

- `docs/WAYPOINT-UNIVERSITY-KNOWLEDGE-MODEL.md`  
- `docs/WAYPOINT-UNIVERSITY-BLOCK2.md`  
- `docs/WAYPOINT-UNIVERSITY-BLOCK2-CHANGELOG.md`  
- `docs/WAYPOINT-UNIVERSITY-ROADMAP.md`  
- `docs/WAYPOINT-UNIVERSITY-FOUNDATION-CHANGELOG.md`  
