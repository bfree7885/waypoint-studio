# SignalTerrain — UX Review (Work Block 8)

**Date:** 2026-07-18  
**Surfaces:** Cyber Awareness home, Daily Brief, Explorer, Advisor, Knowledge, Ingest Health, Topics/Summary/Graph (adjacent)

---

## Overall critique

The cyber surfaces already feel **calmer than typical security tools**: serif headlines, muted bands, explainability copy, and explicit “educational only” framing. The main UX debt is **navigation cohesion and cognitive load across many peer tools**, not visual flash.

Beginners can start from Cyber Awareness, but discovering Brief → Explorer → Advisor → Knowledge as one journey is still uneven. Experts get depth, but must re-orient on each full page load (MPA).

---

## Screen-by-screen

### Cyber Awareness (`cyber/index.html`)

| Item | Detail |
|------|--------|
| **Findings** | Clear disclaimer and section nav; good entry. Risk: grows into a portal of everything. |
| **Evidence** | Hash sections + priority block; links outward to newer surfaces vary by page. |
| **Recommendations** | Keep home as orientation + top attention; deep work lives in dedicated tools. Add a short “Today’s path” (Brief → Advisor) without clutter. |
| **Priority** | Medium |
| **Estimated effort** | 0.5–1 d |
| **Expected impact** | Beginner onboarding |

### Daily Brief (`brief.html`)

| Item | Detail |
|------|--------|
| **Findings** | Strong calm tone; bands avoid alarm chrome. Scenario selector is powerful but can look like “live ops.” |
| **Evidence** | `.st-brief-band--urgent` uses restrained color; sample scenarios dominate. |
| **Recommendations** | Label scenarios as **demonstrations**; surface reading time; link “Why this matters for me” into Advisor with profile context. |
| **Priority** | Medium |
| **Estimated effort** | 0.5–1 d |
| **Expected impact** | Trust / anxiety reduction |

### Explorer (`explorer.html`)

| Item | Detail |
|------|--------|
| **Findings** | Rich panels (graph, timeline, map, research). Risk of information overload on first paint. |
| **Evidence** | Multi-panel hash router; timeline paging (`TIMELINE_PAGE = 12`) helps. |
| **Recommendations** | Default to Overview with one next action; progressive disclosure for map/graph; keep explanations adjacent to edges. |
| **Priority** | High |
| **Estimated effort** | 1–2 d |
| **Expected impact** | First-run comprehension |

### Advisor (`advisor.html`)

| Item | Detail |
|------|--------|
| **Findings** | Answers the right question (“what differently today?”). Inventory/profile editing can intimidate beginners. |
| **Evidence** | Sample inventories; season detection; simulation section architecture-only. |
| **Recommendations** | Guided first run: pick environment → review top 3 actions → optional inventory. Hide simulation behind explicit advanced disclosure. |
| **Priority** | High |
| **Estimated effort** | 1–2 d |
| **Expected impact** | Expert efficiency + beginner safety |

### Knowledge (`knowledge.html`)

| Item | Detail |
|------|--------|
| **Findings** | Encyclopedia/playbooks/paths fit learning. Cross-links to graph are a strength. |
| **Evidence** | Search + knowledge map panels. |
| **Recommendations** | Lead with Learning Paths for beginners; Search for experts; keep encyclopedia secondary. |
| **Priority** | Medium |
| **Estimated effort** | 0.5 d |
| **Expected impact** | Role-appropriate entry |

### Ingest Health (`ingest-health.html`)

| Item | Detail |
|------|--------|
| **Findings** | Correctly internal; should stay out of primary IA. |
| **Evidence** | `noindex`; maintenance copy. |
| **Recommendations** | Keep unlisted from marketing; optional link from About & Limits only. |
| **Priority** | Low |
| **Estimated effort** | — |
| **Expected impact** | Prevents product confusion |

---

## Cross-cutting UX questions

| Question | Assessment | Action |
|----------|------------|--------|
| Navigation intuitive? | Partially — peer links improved in WB8; still MPA | Shared cyber shell / peers helper |
| Information overload minimized? | Mixed — brief good; explorer heavy | Progressive disclosure |
| Explanations understandable? | Strong where priority/explain blocks exist | Keep mandatory |
| Interface calm? | Yes relative to security tools | Protect against red/flash additions |
| Beginners? | Need guided path | Brief → Advisor starter |
| Experts? | Need fewer reloads / deeper filters | Saved views later |
| Cohesive? | Visual language yes; IA almost | Finish peer/nav unification |

---

## Recommendations summary

1. **One cyber journey story** on Awareness home.  
2. **Progressive disclosure** on Explorer first paint.  
3. **Advisor guided mode** vs advanced inventory.  
4. **Always label demos** vs live awareness.  
5. **Preserve calm bands** — never default to siren UI.

Related: [ACCESSIBILITY-REVIEW.md](ACCESSIBILITY-REVIEW.md), [ARCHITECTURE-REVIEW.md](ARCHITECTURE-REVIEW.md).
