# Global Signals — Citizen Impact Dashboard

**Status:** Design only — **not implemented**  
**Product:** Global Signals (Side Trails)  
**Primary question:** *What could this mean for ordinary people?*  
**Related:** [GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md](GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md), [GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md](GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md) *(when present)*, [GLOBAL-SIGNALS-ARTICLES.md](GLOBAL-SIGNALS-ARTICLES.md) *(when present)*, [docs/side-trails/README.md](side-trails/README.md), [docs/side-trails/global-signals.md](side-trails/global-signals.md) *(when present)*

---

## 1. Purpose

The **Citizen Impact Dashboard** is Global Signals’ calm, category-based surface for
translating world-scale public signals into **everyday literacy**.

It answers:

> What could this mean for ordinary people?

It does **not** answer:

> What will happen for certain? Who should we watch? How do markets “guarantee” a move?

This document is a **design contract**. No interactive dashboard runtime, live
feeds, personalization engine, or notification system ships in this branch.

**Positioning:** intelligence platform — not news theater, not a government desk,
not surveillance.

---

## 2. Design principles

| Prefer | Refuse |
| --- | --- |
| “Could mean” / “may notice” language | Certainty, guarantees, forecast theater |
| Category cards tied to the relationship graph | Isolated headline widgets with no provenance |
| Honest confidence + time horizon on every impact | Opaque “risk scores” or urgency meters |
| Facts vs estimates vs placeholders, labeled | Fabricated prices, invented household outcomes |
| Citizens as impact-literacy audience | Citizens as surveillance, profiling, or dossiers |
| Calm, trustworthy, curious tone | Scarcity hacks, fear marketing, engagement farming |
| Sparse honesty when evidence is thin | Filling eleven cards to look “complete” |
| Progressive enhancement (shell first) | Blocking the page on every provider |

**Trust rule:** every material claim on a card must be reachable through the
relationship graph to originating event nodes and evidence. No orphan impacts.

---

## 3. Framing shift: governments → people

Global Signals may ingest geopolitics, trade, infrastructure, weather, conflict,
energy, cyber (public), and policy signals. The Citizen Impact Dashboard **does
not** center ministries, war rooms, or institutional scoreboards.

| Institutional framing (out of scope here) | Citizen framing (in scope) |
| --- | --- |
| What should governments do? | What might households notice? |
| Who is winning geopolitically? | Which everyday categories could shift? |
| Precise market calls | Plausible channels of impact, labeled |
| Named individuals as targets | Community / household *kinds* of impact |

Third-order **citizen** nodes in the Relationship Engine are **impact literacy**
nodes — never personal identity, never location targeting.

---

## 4. Information architecture

```
┌─────────────────────────────────────────────────────────────────┐
| Global Signals · Citizen Impact                                 |
| Question: What could this mean for ordinary people?             |
| Filters (design): time window · confidence · region-coarse      |
└────────────────────────────┬────────────────────────────────────┘
                             |
┌────────────────────────────▼────────────────────────────────────┐
| Category card grid (11)                                         |
| Food · Gasoline · Utilities · Healthcare · Insurance ·          |
| Employment · Housing · Technology · Travel · Consumer Goods ·   |
| Education                                                       |
└────────────────────────────┬────────────────────────────────────┘
                             | open card / follow graph link
┌────────────────────────────▼────────────────────────────────────┐
| Impact detail (same sections as card, expanded)                 |
| + graph path to originating events                              |
| + deep links: Relationship Engine · Cascading Impact · Articles |
└─────────────────────────────────────────────────────────────────┘
```

Optional companion (not required for V1 design): a single “quiet day” banner when
no category has material, sourced impacts above the confidence floor.

Schematic mockup (static illustration only):
[`assets/images/global-signals/citizen-impact-dashboard.svg`](../assets/images/global-signals/citizen-impact-dashboard.svg)

---

## 5. Category cards (required set)

Each category below is a **first-class card**. Cards may be empty with an honest
empty state; they must not invent content to fill the grid.

| Category | Everyday lens (examples of *kinds* of notice) |
| --- | --- |
| **Food** | Grocery prices, availability, seasonal substitutions |
| **Gasoline** | Pump prices, commute cost pressure, travel friction |
| **Utilities** | Power, water, heating/cooling cost or reliability notices |
| **Healthcare** | Access friction, supply of common goods, insurance handoff effects |
| **Insurance** | Premium pressure, coverage language shifts, claim friction |
| **Employment** | Hiring slowdowns/upticks by sector, hours, local opportunity mix |
| **Housing** | Rent/mortgage pressure channels, construction input costs, availability |
| **Technology** | Device/cloud service cost or delay, connectivity reliability |
| **Travel** | Fares, delays, route availability, document/friction changes |
| **Consumer Goods** | Shelf prices, lead times, substitute goods |
| **Education** | Costs, materials, connectivity for learning, institutional disruption |

Categories are **lenses**, not siloed databases. The same originating event may
surface under more than one card when the graph supports multiple citizen paths.

---

## 6. Card content contract

Every populated card (and every distinct impact row within a card) explains:

### 6.1 Current Events

Short, sourced pointers to the public events currently driving this category’s
impacts. Prefer event titles + as-of dates + confidence — not a news ticker.

- Link each event to its graph node id(s).
- Distinguish **reported fact** vs **estimate** vs **placeholder**.

### 6.2 Potential Impacts

What ordinary people *could* notice, in plain language.

- Use conditional phrasing: *could*, *may*, *might*, *is consistent with*.
- Never present a potential impact as a guaranteed outcome.
- Prefer observable household/community effects over abstract macro jargon.

### 6.3 Industries Involved

Sectors and industry nodes on the path between events and citizen effects
(e.g. shipping, refining, retail grocery, insurers, utilities operators).

- Industry labels must resolve to graph `industry` (or related) nodes when claimed.

### 6.4 Why

The causal / correlational rationale in calm prose: which relationships make this
path plausible.

- Must align with edge metadata from the Relationship Engine (`reason` / why).
- No conspiracy-board leaps; if hops are speculative, say so.

### 6.5 Confidence

Honest confidence for the **impact claim**, not for “importance.”

| Label | Meaning |
| --- | --- |
| `confirmed` | Strong public evidence for this path and effect class |
| `likely` | Multiple consistent sources; remaining uncertainty disclosed |
| `possible` | Plausible path; limited or mixed evidence |
| `uncertain` | Weak, contested, or highly conditional |
| `unknown` | Insufficient evidence to rank — show rather than invent |

Confidence must never be upgraded beyond what linked evidence supports.

### 6.6 Time Horizon

When people might notice effects, as a bounded window — not a fake countdown.

| Token (design) | Intent |
| --- | --- |
| `immediate` | Days |
| `near_term` | Weeks |
| `medium_term` | Months |
| `long_term` | Longer structural channel |
| `unclear` | Honest unknown |

UI copy should prefer human phrases (“over the coming weeks”) with the token
available for filters and graph join.

---

## 7. Graph integration

### 7.1 Every impact is a path

An impact is not a free-floating blurb. It is a **documented path**:

```
originating event node(s)
  → relationship edges (why · strength · confidence · direction · delay)
  → industry / commodity / infrastructure intermediates
  → citizen impact-literacy node (category-scoped)
```

Implementation (future) must store `pathEdgeIds[]` and `originNodeIds[]` on each
impact object so the UI can open the same edges the engines use.

### 7.2 Cross-surface links

| Surface | Role relative to this dashboard |
| --- | --- |
| **Relationship Engine** | Source of truth for nodes/edges; card “Why” and industries bind here |
| **Cascading Impact Explorer** | Expand one originating event into interactive 1°→2°→3° branches; Citizen Impact is the category rollup of third-order literacy |
| **Articles** | Narrative packaging (Headline, Waypoint’s Take, Likely Impacts) that may deep-link into the same category cards and graph paths |

Deep-link design (conceptual):

- From a card impact → open Cascading Explorer rooted at `originNodeId`
- From a card impact → highlight path in Relationship Engine view
- From an Article’s Affected Nodes / Likely Impacts → land on matching category card

If a sibling surface is not yet implemented, links remain **documented contracts**
(disabled or “design only” in any future shell) — never fake live navigation.

### 7.3 No orphan rule

| Condition | Behavior |
| --- | --- |
| Impact lacks `originNodeIds` or path edges | Do not publish on the dashboard |
| Evidence URL set empty / broken | Demote or hide; show honest broken-source state in detail |
| Category has no qualifying impacts | Empty state: “No sourced citizen impacts in this window” |

---

## 8. Conceptual data shape

Illustrative only — not a shipped schema.

```json
{
  "impactId": "ci_food_001",
  "category": "food",
  "currentEvents": [
    {
      "nodeId": "evt_sample_port_disruption",
      "label": "Sample port congestion report",
      "asOf": "2026-08-06",
      "confidence": "likely"
    }
  ],
  "potentialImpacts": [
    {
      "statement": "Households may notice higher prices or thinner selection for imported pantry staples.",
      "confidence": "possible",
      "timeHorizon": "near_term"
    }
  ],
  "industriesInvolved": ["shipping", "wholesale_grocery", "retail_grocery"],
  "why": "Public congestion reports connect to shipping delays, then to grocery wholesale lead times.",
  "confidence": "possible",
  "timeHorizon": "near_term",
  "originNodeIds": ["evt_sample_port_disruption"],
  "pathEdgeIds": ["e1", "e2", "e3"],
  "evidence": [{ "title": "…", "url": "https://…", "publisher": "…" }]
}
```

Sample ids are **schematic**. They must never be presented as live intelligence.

---

## 9. Visual & UX direction

- Quiet intelligence bench consistent with Global Signals landing language
  (deep slate, restrained greens/blues) — not purple glow, not news-red urgency.
- One composition: category grid as the primary job of the viewport after a short
  question header — not a multi-widget console.
- Cards are interaction containers (open detail / follow graph), not decorative
  marketing tiles.
- Confidence and time horizon as text labels; color is secondary and never the
  only channel.
- Motion (when implemented): gentle card focus / path reveal; respect
  `prefers-reduced-motion`.
- Mobile: single-column card stack; all six sections reachable without hover-only UI.
- Empty and loading states are honest; never invent SAMPLE impacts outside an
  explicitly labeled design mock.

---

## 10. Accessibility

- Card titles are real headings; sections use clear subheadings.
- Keyboard: tab through cards; Enter opens detail; Escape closes.
- Screen reader name includes category, confidence, and time horizon.
- Do not convey confidence by color alone.
- Graph deep-links must have equivalent text paths (list of hops), not canvas-only.

---

## 11. Privacy, ethics, and non-goals

**In scope:** public-signal literacy for households and communities; explainable
paths; calm education.

**Out of scope forever for this dashboard:**

- Surveillance, profiling, or dossiers on individuals
- Precise household or person-level targeting
- Guaranteed price/forecast claims presented as fact
- Offensive cyber guidance or exploit detail
- Partisan campaign framing or engagement farming
- Push notifications engineered for anxiety

---

## 12. Phased delivery (design roadmap only)

| Phase | Intent |
| --- | --- |
| A | This design + owner review + schematic SVG + docs smoke test |
| B | Shared impact schema joining Relationship Engine edges |
| C | Read-only static category shell with sourced fixtures (explicit SAMPLE) |
| D | Live joins from Cascading Impact + Articles deep-links |
| E | Region-coarse filters + quiet-day posture |

No ship dates implied.

---

## 13. Owner decisions needed

1. Confirm the eleven-category set as V1 (add/remove any before implementation).  
2. Confirm confidence vocabulary (`confirmed` … `unknown`) shared with Relationship Engine edges.  
3. Confirm whether multi-category surfacing of one event is default (proposed: yes).  
4. Confirm quiet-day empty board as success when evidence is thin (proposed: yes).  
5. Confirm Articles deep-link lands on category card vs Cascading Explorer first (proposed: category card with secondary “explore cascade”).

---

## 14. Implementation status

**Not implemented.** This branch delivers documentation, a static SVG schematic,
an owner review, a docs smoke test, playbook lessons, and cross-links only.

---

## Related

- Owner review: [docs/product/global-signals-citizen-impact-owner-review.md](product/global-signals-citizen-impact-owner-review.md)  
- Relationship Engine: [GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md](GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md)  
- Cascading Impact Explorer: [GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md](GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md) *(when present on disk)*  
- Articles system: [GLOBAL-SIGNALS-ARTICLES.md](GLOBAL-SIGNALS-ARTICLES.md) *(when present on disk)*  
- Side Trails: [docs/side-trails/README.md](side-trails/README.md)  
- Product standards: [PRODUCT_STANDARDS.md](PRODUCT_STANDARDS.md)  
