# Owner Review — Global Signals Articles System

**Date:** 2026-08-06  
**Branch:** `feature/global-signals-articles`  
**Base:** `feature/global-signals-side-trails` / SignalTerrain Intelligence Map tip (`aa408fa`)  
**Product:** Global Signals (Side Trails)  
**Deployed:** No  
**Merged:** No  
**Implementation:** None — design documentation only

---

## Verdict

**Approve the Global Signals Articles design for direction.**

Articles are calm, evidence-required intelligence briefs — not a news website.
Every brief carries Headline, Summary, Source, Evidence, Date, Topics, Affected
Nodes, Waypoint’s Take, Likely Impacts, and Confidence. Takes must never restate
the summary; they explain mattering, exposure, citizen notice, and downstream
consequences. Each article attaches to the Relationship Engine graph; focusing a
brief highlights affected nodes.

---

## What shipped

| Artifact | Path |
| --- | --- |
| Design | `docs/GLOBAL-SIGNALS-ARTICLES.md` |
| Schema sketch (non-runtime) | `design-system/global-signals/schema-article-v1.example.json` |
| Owner review | this document |
| Smoke test | `automation/test-global-signals-articles-docs.mjs` |

### Required fields

Headline · Summary · Source · Evidence · Date · Topics · Affected Nodes ·
Waypoint’s Take · Likely Impacts · Confidence  

### Waypoint’s Take duties

Why it matters · Who is affected · Industries exposed · What citizens may notice ·
Possible downstream consequences — **never a summary paraphrase**

### Graph contract

- Auto-connect article → Affected Nodes with why / strength / confidence /
  direction / time delay (Relationship Engine metadata)
- Click/focus article → highlight those nodes
- Citizens nodes = impact literacy, not surveillance

---

## Relationship Engine

Articles are designed against the Global Signals node model (Countries, Ports,
Canals, Shipping lanes, Companies, Industries, Commodities, Energy, Policies,
Tariffs, Wars, Sanctions, Weather, Cyber attacks, Currencies, Infrastructure,
Citizens). Cross-link:
`docs/GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md` (sibling design; may still be on a
parallel branch). Do not invent a second graph.

Outdoor `/articles/` remains a separate curated feed; only the Take≠summary
ethic is shared.

---

## Owner decisions requested

1. Keep **no evidence → no article** as a hard publish gate?  
2. Prefer editor-written Takes for V1 (vs assisted generation with strong QA)?  
3. Should Likely Impacts render as speculative soft edges in the graph by default,
   or stay article-panel only until the Cascading Impact Explorer ships?  
4. Confirm Citizens nodes remain literacy-only (no person-level entities)?

---

## Recommendation

**Approve design.** Push-only review branch. Do not merge as product
functionality — documentation only.
