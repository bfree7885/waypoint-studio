# Waypoint University — Architecture

**Status:** Private · local-first · Work Block 3 (learning engine)  
**Location:** `private/university/`  
**Schema:** `1.2.0`  
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
  ├── wu-schema.js     kinds, relations, stages, bridges, annotations (1.2.0)
  ├── wu-store.js      IndexedDB: nodes, edges, media, meta, revisions
  ├── wu-search.js     inverted index + researchAssist
  ├── wu-markdown.js   Markdown render
  ├── wu-graph.js      adjacency index, BFS neighborhood, radial SVG
  ├── wu-health.js     knowledge-health opportunities
  ├── wu-learn.js      learning profile, map, gaps, next, bridges, timeline
  └── wu-app.js        hash SPA: companion home + learning panels
```

No dependency on `WDS.appShell` / Apps launcher — intentional.

---

## Storage (local-first)

**Database:** `waypoint-university-v1` (IndexedDB)

| Store | Purpose |
|-------|---------|
| `nodes` | Knowledge objects (+ question / source / research / queue / learning / annotations) |
| `edges` | Relationships |
| `media` | Blob metadata + future binary payloads |
| `meta` | Bootstrap flags, `recentViews`, `learningGoals`, `lastWriteAt` |
| `revisions` | Snapshot hooks on save |

---

## Learning engine (Block 3)

- Module `wu-learn.js` derives profile, Understanding Map, gaps, next steps, bridges, timeline  
- Fingerprint cache invalidated on write / open / search-hit recording  
- Stages inferred from use; optional manual override — never grades  
- See `docs/WAYPOINT-UNIVERSITY-BLOCK3.md`

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
| 2 | Graph + learning workspace |
| 3 | Learning engine *(current)* |
| 4+ | Media, scale, optional review — see roadmap |

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
- `docs/WAYPOINT-UNIVERSITY-BLOCK3.md`  
- `docs/WAYPOINT-UNIVERSITY-BLOCK3-CHANGELOG.md`  
- `docs/WAYPOINT-UNIVERSITY-ROADMAP.md`  
- `docs/WAYPOINT-UNIVERSITY-FOUNDATION-CHANGELOG.md`  
