# Waypoint University — Module 6 Changelog

**Status:** Uncommitted — owner review  
**Do not commit / do not push until requested**

---

## Summary

Scholar gains a **local-first research assistant** grounded only in the owner’s knowledge graph. Confidence labels (Known / Likely / Possible / Unknown), citations, decision journal, hypothesis tracking, domain dashboards, writing workspace, compare/synthesis, and natural-language search — without sending research content off-device.

---

## Added

### Engine (`wu-assist.js`)
- Related knowledge on open (notes, projects, sessions, questions, sources, paths, recent)
- Knowledge-gap opportunities (not failures)
- Companion / long-term memory hints (view only — never interrupts writing)
- Local actions: summarize, compare, contradictions, evidence, related, prerequisites, explain, outline, questions, experiments
- Research dashboards by domain lane
- Multi-note comparison + source synthesis
- Natural-language search helpers
- Fingerprint cache + invalidate on store writes
- Prefs: `assistEnabled` (default on), `remoteAiEnabled` (default off; no provider)

### Schema / store (`1.5.0`)
- `DECISION_STATUSES`, `HYPOTHESIS_STATUSES`
- Expanded decision/hypothesis thinking fields
- `getAssistPrefs` / `setAssistPrefs`
- Assist cache invalidation on node/edge writes

### UI
- Nav: Assist · Dashboards · Write · Decisions
- Related sidebar + companion strip on item view
- Assist desk, dashboards, write workspace, compare, synthesize
- Decision / hypothesis edit + view cards
- Settings privacy panel for assistant toggles
- Search uses `naturalSearch` with richer placeholders

### Tests / docs
- `private/university/tests/module6-smoke.mjs`
- `docs/WAYPOINT-UNIVERSITY-BLOCK6.md` (architecture, privacy, performance, debt)
- This changelog + V1.0 assessment

---

## Privacy assessment

- **Default:** all intelligence is local; remote AI off.
- **Remote AI toggle:** reserved for a future provider; Module 6 never transmits library content.
- **Owner can disable** the assistant in Settings.
- **External cosmetic risk:** Google Fonts (unchanged from prior modules) — not research payload.
- **Auth server:** loopback session only; does not sync notes.

---

## Performance report

| Area | Result |
|------|--------|
| Assist script | Deferred load; no remote calls |
| Related / gaps | Cached per graph fingerprint; cleared on write |
| Gap profiling | Returns `elapsedMs` (typically low ms on personal corpora) |
| Editing | No companion recalculation on keystrokes; drafts remain local |
| Search | NL parse is lightweight string rules + existing index |
| Risk at scale | Lexical relatedness scans the library — acceptable for owner corpora; worker/embeddings later |

---

## Honest evaluation — path to Version 1.0

**Module 6 succeeds as a thoughtful research partner for a private library**, not as a chatbot: grounded citations, confidence labels, quiet rediscovery, decision/hypothesis hygiene.

**Still before University V1.0:**
1. Media blobs + complete backup/restore  
2. Authenticated remote private host (not GitHub Pages)  
3. Worker-backed search / graph at multi-thousand-node scale  
4. Duplicate merge + revision restore UI  
5. Optional on-device model with the same citation contract  
6. Automated browser E2E of the Assist journey  

**Ship criteria for “Scholar V1 research assistant” (subset):** local grounding, privacy defaults, decision/hypothesis desks, dashboards, writing focus — **met in this module**, pending owner soak-test on real data.

---

## How to try

```bash
cd private/university && ./start.sh
# open Assist, open a note (related sidebar), Settings → privacy toggles
node private/university/tests/module6-smoke.mjs
```
