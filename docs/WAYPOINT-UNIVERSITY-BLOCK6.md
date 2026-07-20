# Waypoint University — Module 6 · Intelligent Research Assistant

**Status:** Implemented locally · **Do not commit / do not push until requested**  
**Schema:** `1.5.0`  
**Engine:** `private/university/js/wu-assist.js`  
**Shell:** Assist · Dashboards · Write · Decisions · upgraded Search / item view

---

## Purpose

Scholar becomes a research partner that helps the owner discover patterns, organize information, surface forgotten knowledge, and decide with evidence.

It does **not** replace human thinking. It does **not** invent knowledge, edges, or relationships. Every suggestion is grounded in IndexedDB content and labeled:

| Label | Meaning |
|-------|---------|
| **Known** | Directly present in the library or graph |
| **Likely** | Strong overlap or shared structure — still verify |
| **Possible** | Weak signal — a lead, not a fact |
| **Unknown** | Not evidenced in the library |

---

## Architecture

```
Owner browser (IndexedDB)
        │
        ▼
  wu-store ──invalidate──► wu-assist cache
        │
        ├── wu-search / wu-graph / wu-learn (existing)
        └── wu-assist (Module 6)
              ├── relatedFor
              ├── knowledgeGaps
              ├── companionHints / memoryHints
              ├── runAction (local workflows)
              ├── naturalSearch
              ├── researchDashboard
              ├── compareNotes
              └── synthesizeSources
        │
        ▼
  wu-app panels (Assist, Dashboards, Write, Compare, Synthesize, Decisions)
```

**Local-only by default.** `assistPrefs.remoteAiEnabled` defaults to `false`. Even when toggled on, Module 6 has **no remote provider** and never sends research content off-device. Local actions continue to run on-device.

Future local models can plug into `runAction` / a dedicated provider interface without changing the privacy default.

---

## Relationship discovery

On note **view** (not while typing), Scholar surfaces:

- Related notes, projects, sessions, questions, sources, learning paths
- Recently connected concepts
- A short **why** for each suggestion (graph link, tag/project overlap, lexical overlap)

Companion strip examples: older related notes, nearby project lanes, questions that may now be answerable. Suggestions stay subtle and never interrupt the editor.

---

## Knowledge gap detection

`knowledgeGaps` profiles incomplete areas as **opportunities**:

- Frequently connected topics with thin documentation
- Mentions without definitions
- Projects missing sources or research support
- Paths missing foundations
- Questions with little evidence

Never framed as failures.

---

## Decision journal & hypotheses

Kinds `decision` and `hypothesis` with full thinking fields:

**Decision:** decision made, reasoning, evidence used, alternatives, expected outcome, confidence, review date, later observations.

**Hypothesis:** statement, supporting / contradicting evidence, experiments, confidence, status (`proposed` → `retired`). Explicitly **not treated as facts**.

UI: Decisions nav · Thinking tools stubs · item edit/view cards.

---

## Research dashboards

Calm per-domain summaries (Photography, Cyber, Linux, GIS, Waypoint Studio, Ecology, AI, Tea, Wine):

Current activity · Recent discoveries · Open questions · Sessions · Connected projects · Priority reading.

---

## Writing workspace

`#write` — long-form Markdown editing with draft autosave, related-knowledge sidebar, focus on the text. Citation helper remains architectural (insert via links / Assist citations).

---

## Multi-note comparison & source synthesis

- **Compare:** shared tags/projects, neighboring sources, conflict signals, unique tags, possible duplicates.
- **Synthesize:** agreement / disagreement language, unsupported claims cues, unanswered questions — nuance preserved; citations required.

---

## Search evolution

`Assist.naturalSearch` interprets phrases such as:

- Show everything related to …
- Find notes mentioning both X and Y
- Show unresolved questions about …
- Find research sessions involving …

Results keep match reasons from the search index plus interpretation notes.

---

## Performance

| Mechanism | Behavior |
|-----------|----------|
| Fingerprint cache | Related + gaps cached until graph write fingerprint changes |
| Invalidate on write | `putNode` / `deleteNode` / `putEdge` / `deleteEdge` clear Assist cache |
| Profiles | Gap detection returns `elapsedMs` |
| Startup | Assist is a deferred script; no network for intelligence |
| Editing | Companion / related only on view; drafts still local |

Honest limit: lexical overlap is O(n) over library size; fine for personal corpora, not a substitute for a worker-backed index at 10k+ nodes.

---

## Privacy review

| Feature | Leaves device? | Notes |
|---------|----------------|-------|
| Assist actions, related, gaps, dashboards, NL search | **No** | Pure browser computation |
| Decision / hypothesis storage | **No** | IndexedDB |
| Export JSON / Markdown | **No** (download) | Owner-initiated file save |
| Owner auth server | Loopback only | Password/session; not research sync |
| Remote AI toggle | **No transmission in M6** | Toggle reserved; refuses / documents no provider |
| Google Fonts CSS | Cosmetic network | Unrelated to research content; can be blocked offline |

Documented in Settings → Research assistant & privacy. Owner can disable the assistant entirely.

---

## Remaining technical debt

1. No on-device LLM / embedding model yet — heuristics + graph only  
2. Citation *insert* into the editor is manual (helper architecture only)  
3. Compare/synth UX is multi-select, not a polished canvas  
4. Whole-graph overview + worker search still later  
5. Media / full backup and remote private host still open (prior roadmap)  
6. Automated browser IDB E2E for Assist UI still manual  

---

## Future recommendations

1. Optional local model (llama.cpp / WebGPU) behind the same confidence + citation contract  
2. Embeddings for relatedness with an explicit “Possible” floor  
3. Decision review reminders from `reviewDate`  
4. Hypothesis ↔ experiment edge typing in the graph  
5. Writing-mode “insert citation” from Assist cite list  

---

## Version 1.0 honesty

Module 6 makes Scholar feel like a grounded research partner for a personal library. It is **not** yet Version 1.0 of University overall (media backup, authenticated remote host, scale graph, merge/restore remain). See changelog assessment.
