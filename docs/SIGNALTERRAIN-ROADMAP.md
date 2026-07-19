# SignalTerrain — Master Engineering Roadmap

**Status:** Living document  
**North star:** Help people understand the cybersecurity landscape through transparent, educational, defensive intelligence.  
**Rule:** Future work is selected from these milestones — not invented ad hoc.

**Related:** [SIGNALTERRAIN-ARCHITECTURE.md](SIGNALTERRAIN-ARCHITECTURE.md) · [SIGNALTERRAIN-ROADMAP.md](SIGNALTERRAIN-ROADMAP.md) · [DECISIONS.md](DECISIONS.md) · [CHANGELOG-ARCHITECTURE.md](CHANGELOG-ARCHITECTURE.md) · [SIGNALTERRAIN-PLATFORM-ARCHITECTURE.md](SIGNALTERRAIN-PLATFORM-ARCHITECTURE.md)

> Studio-wide portfolio roadmap remains [ROADMAP.md](ROADMAP.md). **This file** (`SIGNALTERRAIN-ROADMAP.md`) is the authoritative SignalTerrain engineering roadmap. The living-doc set also includes Architecture, Decisions, and Changelog as required by the master plan.

---

## North star

SignalTerrain is an **Intelligence Platform** for individuals, educators, developers, researchers, home labs, nonprofits, and small organizations.

It answers:

- What changed?
- Why does it matter?
- Does it affect me?
- What should I learn?
- What should I do next?

It is **not** a SIEM, EDR, or offensive security platform.

---

## Principles

Every future feature must satisfy:

| Principle | Meaning |
|-----------|---------|
| Privacy first | Local-first defaults; no surprise exfiltration |
| Education first | Literacy over alarm |
| Local first whenever practical | On-device research and inventory |
| Explainable decisions | Transparent factors; no black-box scores |
| Calm technology | No siren chrome; quiet empty states |
| Honest uncertainty | Known / likely / possible / unknown |
| Defensive only | No scanning, exploit payloads, or offense |
| Shared platform architecture | One research store, one graph, reusable systems |
| Accessibility by default | Keyboard, focus, contrast, reduced motion |
| Modular components | Surfaces compose services; no siloed forks |

If a proposal conflicts, **redesign before implementation**.

---

## Progress snapshot (2026-07-18)

| Milestone | Goal | Status |
|-----------|------|--------|
| **1** Platform foundation | Stable internal architecture | **Largely complete** (prototype) |
| **2** Live intelligence | Replace demonstration data | **Partial — live engine + dashboard operational** |
| **3** Personalization | Relevant to the user | **Partial** (profiles, inventory, watchlists, advisor, seasons, brief audiences) |
| **4** Knowledge platform | Long-term learning | **Partial V0.1** (encyclopedia, playbooks, incidents, paths) |
| **5** Visual exploration | Explore instead of scroll | **Partial** (explorer, maps, timelines; deepen saved views) |
| **6** Personal workspace | Everyday research | **V1 complete** (export still future) |
| **7** Operational awareness | Better daily decisions | **Partial** (brief + advisor + priority; trends/history thinner) |
| **8** Mobile experience | Phones & tablets | **Not started** |
| **9** Shared signal platform | Unify Cyber + RF | **Architecture ready; RF shallow** |
| **10** Beta readiness | Private beta gate | **Not started** |
| **11** Public preview | Limited users + feedback | **Not started** |
| **12** Long-term evolution | Evaluate modules individually | **Backlog only** |

**Recommended next engineering focus:** Finish Milestone **2** remaining vendor feeds + scheduled refresh, while migrating brief/explorer/advisor defaults fully onto the live artifact.

---

## Milestone 1 — Platform foundation

### Goal

Stable internal architecture.

### Complete (shipped)

- Shared intelligence graph (`cy_*`) + relationship helpers  
- Knowledge platform V0.1  
- Ingestion pipeline (mock) + provenance/cache schemas  
- Explainability + priority engine  
- Timeline (entity + personal)  
- Cyber Operations Workspace V1  
- Architecture / debt / hardening review (Work Block 8)

### Remaining for exit

- [ ] No meaningful duplicated data models (finish util/chrome convergence)  
- [ ] Broader unit/contract coverage for core services  
- [ ] Keep docs synchronized after each milestone  

### Exit criteria

- No duplicated data models  
- Stable shared services  
- Comprehensive documentation  
- Unit tests for core services  

---

## Milestone 2 — Live intelligence

### Goal

Replace demonstration data with trusted public sources.

### Potential categories

Government advisories · public vulnerability DBs · vendor advisories / release notes · patch information · public security news · research publications  

### Requirements

Provenance retained · cached locally · version history · health monitoring · graceful degradation  

### Exit criteria

- Daily updates function  
- Source failures handled gracefully  
- Complete audit trail  

**Do not** fake live feeds. Prefer narrow, cited connectors first.

---

## Milestone 3 — Personalization

### Goal

Intelligence relevant to the user.

### Build / deepen

Technology inventory · security profiles · watchlists · exposure analysis · adaptive recommendations · cyber seasons · daily briefing personalization  

### Already prototype

Inventory + profiles + exposure + advisor + seasons + audience profiles + watchlists (workspace).

### Exit criteria

Recommendations relevant to the user’s environment — not generic headlines.

---

## Milestone 4 — Knowledge platform

### Goal

Long-term learning value during quiet periods.

### Expand

Encyclopedia · incident library · playbooks · learning paths · interactive diagrams · relationship maps · historical timelines  

### Exit criteria

SignalTerrain remains valuable when news is quiet.

---

## Milestone 5 — Visual exploration

### Goal

Explore instead of scroll.

### Develop

Relationship explorer · interactive timelines · technology maps · knowledge graphs · vendor / product / campaign explorers · filtering · saved views  

### Exit criteria

Users investigate visually with clear explanations of every relationship.

---

## Milestone 6 — Personal workspace

### Goal

Everyday research environment.

### Complete (V1)

Investigations · notes · collections · bookmarks · reading queue · watchlists · workspace dashboard · cross-linking  

### Remaining

- [ ] Export architecture (portable bundles)  
- [ ] Richer attachment bodies (refs exist)  

### Exit criteria

Users organize long-term cybersecurity research without external tools.

---

## Milestone 7 — Operational awareness

### Goal

Better daily decisions.

### Implement / deepen

Adaptive Defense Advisor · daily briefings · priority reasoning · trend detection · change summaries · recommendation engine · recommendation history  

### Exit criteria

The platform explains priorities rather than listing alerts.

---

## Milestone 8 — Mobile experience

Responsive layouts · offline mode · sync architecture · quick briefings · reading mode · accessibility · touch-first navigation  

### Exit criteria

Full functionality on phones and tablets.

---

## Milestone 9 — Shared signal platform

Unify Cyber and RF (and later Infrastructure / Research) behind shared:

Timeline · workspace · knowledge graph · collections · notes · bookmarks · search · relationship engine · visualization · authentication · settings  

### Exit criteria

One coherent SignalTerrain with domain-specific workflows — not parallel products.

---

## Milestone 10 — Beta readiness

Performance · accessibility audit · security review · documentation · localization readiness · search optimization · privacy-preserving analytics · disaster recovery · packaging · release checklist  

### Exit criteria

Stable private beta.

---

## Milestone 11 — Public preview

Limited users. Measure reliability, performance, clarity, navigation, learning effectiveness, trust. Collect qualitative feedback before major new capabilities.

---

## Milestone 12 — Long-term evolution

Evaluate individually (only if they reinforce philosophy):

Software inventory correlation · defensive configuration guidance · SBOM exploration · threat modeling workspace · compliance reference library · supply chain visualization · privacy engineering guidance · AI safety references · home lab planning · digital resilience planning  

---

## Release checklist (every milestone)

1. Architecture review  
2. Documentation review  
3. Accessibility review  
4. Performance review  
5. Privacy review  
6. Testing  
7. Owner approval  
8. Commit  
9. Push  

Then update: this roadmap · [SIGNALTERRAIN-ARCHITECTURE.md](SIGNALTERRAIN-ARCHITECTURE.md) · [DECISIONS.md](DECISIONS.md) · [CHANGELOG-ARCHITECTURE.md](CHANGELOG-ARCHITECTURE.md).

---

## Success metrics

Users say:

- “I understand why this matters.”  
- “I know what changed.”  
- “I know what to ignore.”  
- “I know what to learn next.”  
- “I trust the explanations.”  

**Not** when the product displays the most alerts.
