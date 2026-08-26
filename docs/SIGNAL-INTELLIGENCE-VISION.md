# Signal Intelligence Vision V1

**Internal architecture only.** This is not a public Waypoint product.
Reusable schemas live under `design-system/signal-intelligence/` and may feed
future Waypoint Deck situational awareness. Canonical portfolio:
[`PRODUCT-DIRECTION.md`](PRODUCT-DIRECTION.md).


**Status:** Active foundation (architecture — no live ingestion or production dashboard)  
**Tagline:** Notice important changes. Explain why they matter. Then let people decide.  
**Audience:** Product, editorial, design, and future Waypoint Deck / Dashboard surfaces  
**Primary consumer:** Waypoint Deck (internal situational awareness — not a public product)

This is the long-term product vision for Waypoint Studio’s **Signal Intelligence** platform.

It is **not** a vulnerability scanner.  
It is **not** a penetration testing tool.  
It is **not** an offensive security project.  
It is **not** a SOC.

It is an intelligence platform that helps people understand what is happening across the digital, radio, and global signal environment — with the calm of an experienced park ranger.

---

## Mission

Signal Intelligence helps people answer:

| Question | What the product provides |
|----------|---------------------------|
| What is happening right now? | A calm, cited picture of current conditions |
| What changed? | Clear deltas — not endless feeds |
| Why should I care? | Context and consequences, not panic |
| How trustworthy is this? | Evidence, confidence, unknowns, sources |
| What should I understand before deciding? | Perspective and related research — then space to decide |

The product provides **awareness**.

Not panic.  
Not sensationalism.  
Not fear.

---

## Philosophy

| Be | Do not be |
|----|-----------|
| Guide | Teacher who lectures |
| Analyst | Alarmist |
| Evidence-led | Speculative by default |
| Transparent | Mysterious |
| Contextual | Headline-driven |

**Guide, not teacher.**  
**Analyst, not alarmist.**  
**Evidence, not speculation.**  
**Transparency, not mystery.**  
**Context, not headlines.**

The cyber / radio / infrastructure equivalent of a park ranger: notice what matters, explain why, give trusted context, then step back.

Inherits: [Constitution](WAYPOINT-CONSTITUTION.md) · [Trust Framework](WAYPOINT-TRUST-FRAMEWORK.md) · [Guide Experience](WAYPOINT-GUIDE-EXPERIENCE.md) · [Editorial Standards](WAYPOINT-EDITORIAL-STANDARDS.md) · [Research Integrity](RESEARCH-INTEGRITY.md).

---

## Product boundaries

### In scope (platform)

- Situational awareness across RF, cyber, infrastructure, space weather, communications, GPS, outages, cloud incidents, major advisories, and future geopolitical *signal* layers (awareness only)
- Modular architecture so domains can grow independently
- Shared Signal Card / observation contracts
- Curated knowledge and Waypoint Perspective on every important signal
- Trust fields on every signal (evidence, confidence, sources, unknowns)
- Calm dashboard concepts that answer change, importance, attention, and stability
- Design for future cited sources (CISA, NVD, NOAA, status pages, etc.) — **ingestion not implemented in V1**

### Out of scope (permanent non-goals)

- Offensive security, exploit development, malware analysis tooling  
- Scanning, credential testing, attack simulation, penetration testing  
- Hacking tutorials, exploit code, vulnerability proof-of-concepts  
- Enterprise SOC / SIEM replacement  
- Fear scoring, gamified threat levels, clickbait digests  
- Fabricating signals, incidents, advisories, or outages  

This is an **awareness and intelligence** platform.

---

## Product family shape

```
Signal Intelligence (shared platform / engine)
        │
        ├── Waypoint Deck ── internal consumer (situational awareness)
        ├── Dashboard ───── ambient glance (future)
        ├── Knowledge ───── research & library depth
        ├── Worth Noticing ─ calm observation cues (where relevant)
        └── Education ───── literacy modules (future)
```

Signal Intelligence is a **shared capability**, not a second top-level nav product.  
Do not invent a parallel “Cyber” product in navigation.

---

## Eventual module landscape

Independent modules (design for all; build few):

| Module | Intent |
|--------|--------|
| Threat Landscape | Calm overview of named campaigns / conditions — literacy, not hunting |
| Major Vulnerabilities | Cited CVE / advisory awareness |
| Active Exploitation | Cited “in the wild” reports — awareness only |
| Ransomware | Campaign literacy + backup hygiene context |
| Infrastructure | Connectivity and supporting systems |
| Cloud Status | Public provider status — cited |
| Internet Health | Outages, DNS, BGP at educational depth |
| Space Weather | Solar / geomagnetic effects on RF and some services |
| Radio Conditions | Propagation, band activity, listening context |
| GPS Integrity | Navigation reliability awareness |
| Communications | Broader comms disruptions |
| Technology News | Curated, non-clickbait tech signal notes |
| Research | Deeper technical reading |
| Knowledge Library | Curated entries with Waypoint Perspective |

Full catalog: `design-system/signal-intelligence/modules.json`.

---

## Dashboard intent

The dashboard should answer four questions only:

1. **What changed today?**  
2. **What is currently important?**  
3. **What deserves attention?**  
4. **What is stable?**  

Avoid becoming a news website.  
Avoid endless scrolling.  
Avoid clickbait.

Wireframe: `design-system/patterns/signal-intelligence-dashboard.html`.

---

## Curated knowledge on every alert

Every important signal should support:

| Field | Purpose |
|-------|---------|
| What happened? | Plain summary |
| Why it matters | Consequence without drama |
| Evidence | What supports the claim |
| Confidence | Shared label (Trust system) |
| Original sources | Primary citations |
| Waypoint Perspective | Editorial judgment — clearly labeled |
| Related research | Knowledge library links |

Aligns with [Curated Knowledge Platform](WAYPOINT-KNOWLEDGE-PLATFORM.md).

---

## Trust on every signal

Every signal should expose:

- Evidence quality  
- Confidence  
- Last updated  
- Source  
- Verification status  
- Unknowns  
- Limitations  

Never hide uncertainty.

Aligns with [Evidence Model](WAYPOINT-EVIDENCE-MODEL.md) and [Confidence System](WAYPOINT-CONFIDENCE-SYSTEM.md).

---

## Experience tone

Calm. Professional. Analytical. Editorial. Minimal.

**Not** a security operations center.  
**Not** a hacker console.  
**Not** Hollywood.

Users should feel **informed** — never overwhelmed.

Design language: `design-system/signal-intelligence/design-language.json`.

---

## Document map

| Document | Role |
|----------|------|
| **This file** | Mission, philosophy, boundaries, tone |
| [Architecture](SIGNAL-INTELLIGENCE-ARCHITECTURE.md) | Modules, data models, nav, dashboard, integrations |
| [Roadmap](SIGNAL-INTELLIGENCE-ROADMAP.md) | Phased delivery without premature claims |
| [Engine](SIGNAL-INTELLIGENCE-ENGINE.md) | Observation contract detail (v0.1 → V1) |
| [Integrations](SIGNAL-INTELLIGENCE-INTEGRATIONS.md) | Consumer contracts |

Package: `design-system/signal-intelligence/`.
Internal ingest: `scripts/deck-signals/`.

---

## Success criteria

Foundation V1 succeeds when:

1. Anyone on the team can explain what Signal Intelligence **is** and **is not** in one minute.  
2. Modules, Signal Card, sources, and nav are documented without shipping fake live feeds.  
3. Trust, Knowledge, Constitution, and Editorial standards are explicitly inherited.  
4. Waypoint Deck may consume these contracts internally; no parallel Cyber nav product appears.  
5. Future ingestion can plug into contracts without redesigning the product story.

---

## Related

- [PLATFORM-ENGINES.md](PLATFORM-ENGINES.md)  
- [WAYPOINT-PRODUCT-FRAMEWORK.md](WAYPOINT-PRODUCT-FRAMEWORK.md) — Monitor verb  
- Package README: `design-system/signal-intelligence/README.md`
