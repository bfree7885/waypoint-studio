# Owner Review — Global Signals Citizen Impact Dashboard

**Date:** 2026-08-06  
**Branch:** `feature/global-signals-citizen-impact`  
**Base:** `feature/signalterrain-intelligence-map-design` / Side Trails tip (`aa408fa`)  
**Product:** Global Signals (Side Trails)  
**Deployed:** No  
**Merged:** No  
**Implementation:** None — design documentation only

---

## Verdict

**Approve the Citizen Impact Dashboard design for direction.**

The dashboard answers **What could this mean for ordinary people?** through eleven
everyday category cards (Food through Education). Each impact carries Current
Events, Potential Impacts, Industries Involved, Why, Confidence, and Time Horizon,
and must link through the relationship graph to originating events. Calm,
“could mean” language only — no certainty theater, no surveillance framing.

No interactive UI runtime ships in this branch.

---

## What shipped

| Artifact | Path |
| --- | --- |
| Design | `docs/GLOBAL-SIGNALS-CITIZEN-IMPACT-DASHBOARD.md` |
| Schematic SVG | `assets/images/global-signals/citizen-impact-dashboard.svg` |
| Owner review | this document |
| Docs smoke test | `automation/test-global-signals-citizen-impact-docs.mjs` |
| Playbook lesson | `docs/ENGINEERING-PLAYBOOK.md` (Lessons Learned) |

### Category cards specified

Food · Gasoline · Utilities · Healthcare · Insurance · Employment · Housing ·
Technology · Travel · Consumer Goods · Education

### Per-card / per-impact sections

Current Events · Potential Impacts · Industries Involved · Why · Confidence ·
Time Horizon

### Graph integration

Every impact requires origin nodes + path edges; deep-link contracts to
Relationship Engine, Cascading Impact Explorer, and Articles (when those docs
exist on disk).

### Hard rules

- “Could mean” language — never imply certainty  
- No orphan impacts (graph path required)  
- No surveillance / profiling / individual targeting  
- Honest empty cards and quiet days  
- Design only — not implemented  

---

## Relationship to sibling Global Signals work

| Doc / surface | Relationship |
| --- | --- |
| Relationship Engine | Nodes/edges are the provenance backbone for Why / industries / paths |
| Cascading Impact Explorer | Event-rooted expansion; this dashboard is the category rollup of citizen-literacy ends |
| Articles | Narrative packaging that should deep-link into the same categories and paths |
| Global Signals landing | Product story; roadmap “Later” already points at citizen-impact explanations |

---

## Owner decisions requested

1. Keep the eleven-category V1 set as listed?  
2. Share confidence vocabulary with Relationship Engine edges?  
3. Allow one event to appear under multiple categories by default?  
4. Treat quiet-day empty board as success?  
5. Article deep-link → category card first (with secondary cascade link)?

---

## Recommendation

**Approve design.** Push-only review branch. Do not merge as product
functionality — documentation and schematic only.
