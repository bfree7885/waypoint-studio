# Signal Intelligence Architecture V1

**Status:** Active foundation (contracts + blueprints — no production collectors)  
**Package:** `design-system/signal-intelligence/`  
**Vision:** [SIGNAL-INTELLIGENCE-VISION.md](SIGNAL-INTELLIGENCE-VISION.md)  
**Primary product home:** SignalTerrain

This document defines the scalable architecture for the Signal Intelligence product family: modules, shared data models, navigation, dashboard composition, knowledge/trust integration, and future AI responsibilities.

**Do not implement live ingestion in this phase.** Design for it.

---

## System overview

```
Future cited sources (CISA, NVD, NOAA, status pages, …)
        │   [ingestion: not implemented]
        ▼
 Normalization layer (future)
        │
        ▼
 Signal Card  ←── Observation schema (v0.1 / v1)
   ├── module + domain + taxonomy
   ├── what / why / changed
   ├── evidence · confidence · unknowns
   ├── verification · sources · last updated
   ├── Waypoint Perspective
   └── related research (wk_*)
        │
        ├── Attention model (calm reorder)
        ├── Knowledge Platform
        └── Trust / Evidence Card
        ▼
 Surfaces
   ├── SignalTerrain (primary)
   ├── Intelligence Dashboard (wireframe)
   ├── Studio Dashboard glance (later)
   └── Education / Scenes (later)
```

Engines compose. Signal Intelligence is not a standalone top-level product beside SignalTerrain.

---

## Layered architecture

| Layer | Responsibility | V1 status |
|-------|----------------|-----------|
| **Sources catalog** | Named future feeds + honesty rules | Designed (`sources-catalog.json`) |
| **Normalization** | Map raw citations → Signal Card | Not implemented |
| **Core models** | Observation, Signal Card, modules, taxonomy | Contracts |
| **Attention** | Calm focus without alarmism | Contracts (`attention.json`) |
| **Trust** | Evidence Card + confidence labels | Inherit Trust Framework |
| **Knowledge** | Perspective + related reading | Inherit Knowledge Platform |
| **Surfaces** | Nav, dashboard wireframe, SignalTerrain shell | Blueprint + foundation shell |
| **AI** | Optional assist with disclosure | Responsibilities defined; no new AI system |

---

## Module architecture

Modules are **independent**. Each can ship, pause, or deepen without redesigning the platform.

Catalog: `design-system/signal-intelligence/modules.json`.

### Module contract

Every module declares:

| Field | Meaning |
|-------|---------|
| `id` | Stable module id (e.g. `space-weather`) |
| `label` | User-facing name |
| `domain` | `rf` · `cyber` · `infrastructure` · `cross-cutting` |
| `status` | `blueprint` · `foundation` · `planned` · `active` |
| `questions` | Which mission questions it answers |
| `signalKinds` | Taxonomy / category affinities |
| `dashboardSlot` | Where it may appear on the intelligence dashboard |
| `notGoals` | Explicit non-goals for that module |

### Initial modules (blueprint — not all built)

Threat Landscape · Major Vulnerabilities · Active Exploitation · Ransomware · Infrastructure · Cloud Status · Internet Health · Space Weather · Radio Conditions · GPS Integrity · Communications · Technology News · Research · Knowledge Library

**Build principle:** ship the thinnest honest module first; leave others labeled Planned.

---

## Shared data models

### 1. Observation (engine contract)

Canonical educational observation of an invisible environment.

- Schema v0.1: `schema-v0.1.json` (shipped architecture)  
- Schema v1: `schema-v1.json` — adds Signal Card fields (perspective, verification, trust label crosswalk, module id, related knowledge)

Required honesty: confidence block, evidence, threat-context phase, **at least one unknown**.

### 2. Signal Card (user-facing unit)

The unit a person opens when they need to understand a signal.

| Section | Source fields |
|---------|---------------|
| What happened | `summary` |
| Why it matters | `attention.whyItMatters` + `explanation` |
| What changed | `attention.whatChanged` + `historicalComparison` |
| Evidence | `evidence[]` → Trust Evidence Card |
| Confidence | engine levels ↔ Trust recommendation labels |
| Sources | `source` + evidence URLs |
| Verification | `verification.status` |
| Unknowns / limitations | `unknowns` · `conflicts` · disclaimer |
| Waypoint Perspective | `waypointPerspective` (editorial, labeled) |
| Related research | `relatedKnowledgeIds` |
| Last updated | `meta.updatedAt` / `verification.lastVerifiedAt` |
| Calm guidance | `attention.calmGuidance` (required when severity elevated+) |

Never promote a Signal Card with rumor evidence as verified fact.

### 3. Taxonomy

Domains: RF · Cyber · Infrastructure (`taxonomy.json`).  
Terms label **awareness topics**, not attack techniques or SOC ticket types.

### 4. Confidence

Engine levels: `high` · `moderate` · `low` · `speculative` · `insufficient` (`confidence.json`).

Crosswalk to platform Trust labels via `design-system/trust/confidence-map.json` (`engineCrosswalk`). Prefer labels over fake percentages.

### 5. Threat context (timeline framing)

Phases: current · emerging · resolved · historical · seasonal (`threat-context.json`).  
Not actor dossiers. Not kill-chain theater.

### 6. Adaptive attention

Focus areas raise educational visibility; tone forbids SOS alarmism (`attention.json`).  
Attention may reorder digests; it must not auto-launch tools or scanners.

### 7. Sources catalog (future)

Named classes of feeds with verification expectations — **no connectors** in V1 (`sources-catalog.json`).

Examples: CISA · NVD · MITRE · US-CERT · NIST · NOAA Space Weather · cloud status pages · BGP incident feeds · internet outage providers · OSINT (strict curation) · government advisories · professional orgs · academic research.

---

## Navigation structure

Product home remains **SignalTerrain**. Signal Intelligence defines **intelligence IA** inside that home (and later Dashboard glances).

Catalog: `design-system/signal-intelligence/navigation.json`.

### Proposed IA (blueprint)

```
SignalTerrain
├── Overview (today’s change + stability)
├── Watch (items that deserve attention)
├── Library (modules index — filterable)
│   ├── Radio & spectrum
│   ├── Digital & cyber awareness
│   ├── Infrastructure & space
│   └── Research & knowledge
├── Signal (detail / Signal Card)
└── About / Limits (what this is not)
```

Rules:

1. No parallel top-level “Cyber” product in Studio nav.  
2. Planned modules stay labeled Planned.  
3. Empty states invite understanding — never fake density.  
4. “About / Limits” is first-class, not a footer afterthought.

---

## Dashboard composition

Wireframe: `design-system/patterns/signal-intelligence-dashboard.html`.

### Four panels (fixed jobs)

| Panel | Job | Content rule |
|-------|-----|--------------|
| **Changed today** | Deltas since last quiet baseline | Few items; each must say *what* changed |
| **Currently important** | Highest calm priority | Max small set; confidence visible |
| **Deserves attention** | Watch list | Attention levels `learn` / `act-calmly` / `monitor` |
| **Stable** | What is *not* on fire | Explicit quiet — reduces anxiety |

### Anti-patterns

- Infinite scroll news river  
- Red severity walls  
- Unsourced ticker  
- “Trending threats” gamification  
- Placeholder cards inventing CVEs or outages  

### Density budget

Prefer **one screen of calm composition** on desktop; stack the four panels on mobile without duplicating the same signal four times.

---

## Knowledge integration

| Knowledge capability | How SI uses it |
|----------------------|----------------|
| Curated entries (`wk_*`) | Related research on Signal Cards |
| Waypoint Perspective | Editorial judgment on important signals |
| Domain tags | `signalterrain` / `signal-intelligence` |
| Editorial standards | Source selection, correction, archive |

Every alert that surfaces as “important” should be able to open into Knowledge depth without leaving the trust model.

---

## Trust integration

| Trust capability | How SI uses it |
|------------------|----------------|
| Evidence Card | Expand evidence / sources / uncertainty |
| Confidence labels | UI vocabulary for Signal Cards |
| Research Integrity | Badges / footnotes on digests |
| Constitution | Decision OS for any future AI assist |

Honesty checklist remains in [Integrations](SIGNAL-INTELLIGENCE-INTEGRATIONS.md).

---

## Future AI responsibilities

AI may assist later. It does **not** become a mystery oracle.

| Allowed | Forbidden |
|---------|-----------|
| Summarize cited sources with disclosure (`meta.aiAssisted`) | Invent incidents, CVEs, spectrum hits |
| Suggest calm next steps from policy text | Recommend exploitation or scanning |
| Draft Waypoint Perspective for human edit | Publish Perspective without editorial ownership |
| Rank digest candidates by attention rules | Auto-escalate fear language |
| Flag conflicts / unknowns | Hide uncertainty to sound authoritative |

AI inherits [Constitution](WAYPOINT-CONSTITUTION.md) and [AI Principles](WAYPOINT-AI-PRINCIPLES.md).  
No new AI system is introduced in Foundation V1.

---

## Design language (initial)

Tokens and principles: `design-system/signal-intelligence/design-language.json`.

Summary:

- **Metaphor:** observatory / ranger briefing — not NOC wall  
- **Typography:** editorial clarity; restrained hierarchy  
- **Color:** quiet neutrals; severity is typographic and labeled, not neon  
- **Motion:** slow fades for panel updates; no siren pulses  
- **Chrome:** minimal; avoid terminal green / matrix / HUD clichés  
- **Cards:** Signal Card is an interaction container — not a dashboard of nested cards  

---

## Privacy & ethics (architecture constraints)

1. Private receivers, audio, and precise locations stay local by default.  
2. Shared maps / community receivers remain opt-in.  
3. Location precision defaults coarse.  
4. Cyber digests must not require uploading home-network inventories.  
5. Never ship exploit PoCs or attack procedures in this package family.  
6. Public-safety RF topics carry legal compliance notes.

Aligns with SignalTerrain Playbook and Constitution privacy philosophy.

---

## Relationship to existing v0.1 engine

Foundation V1 **elevates** the v0.1 package; it does not discard it.

| Artifact | Role after V1 |
|----------|----------------|
| `schema-v0.1.json` | Stable observation core |
| `schema-v1.json` | Signal Card extensions |
| Engine / Integrations docs | Still authoritative for consumers |
| Vision / Architecture / Roadmap | Product-family blueprint |

---

## Success criteria

Architecture V1 succeeds when a future implementer can:

1. Add a module without inventing a new alert schema.  
2. Render a Signal Card with Trust + Knowledge fields.  
3. Build the four-panel dashboard without a news feed.  
4. Plug a cited source into the sources catalog contract.  
5. Keep SignalTerrain as home and avoid SOC UX.

---

## Related

- [SIGNAL-INTELLIGENCE-ROADMAP.md](SIGNAL-INTELLIGENCE-ROADMAP.md)  
- [SIGNAL-INTELLIGENCE-ENGINE.md](SIGNAL-INTELLIGENCE-ENGINE.md)  
- [WAYPOINT-TRUST-FRAMEWORK.md](WAYPOINT-TRUST-FRAMEWORK.md)  
- [WAYPOINT-KNOWLEDGE-PLATFORM.md](WAYPOINT-KNOWLEDGE-PLATFORM.md)
