# Signal Intelligence Roadmap V1

**Internal architecture only.** This is not a public Waypoint product.
Reusable schemas live under `design-system/signal-intelligence/` and may feed
future Waypoint Deck situational awareness. Canonical portfolio:
[`PRODUCT-DIRECTION.md`](PRODUCT-DIRECTION.md).


**Status:** Active foundation roadmap (planning — not a shipping commitment calendar)  
**Vision:** [SIGNAL-INTELLIGENCE-VISION.md](SIGNAL-INTELLIGENCE-VISION.md)  
**Architecture:** [SIGNAL-INTELLIGENCE-ARCHITECTURE.md](SIGNAL-INTELLIGENCE-ARCHITECTURE.md)

This roadmap sequences the Signal Intelligence product family so contracts land before collectors, and honesty labels land before marketing claims.

Dates are **directional**. Status labels matter more than calendar promises.

---

## North star

People open SignalTerrain (and later Dashboard glances) and leave more aware — never more panicked — about radio, digital, and global signal conditions.

---

## Phase map

| Phase | Name | Outcome | Runtime |
|-------|------|---------|---------|
| **V0.1** | Engine contracts | Observation schema, taxonomy, confidence, attention, threat context | None (done) |
| **V1** | Product foundation | Vision, architecture, modules, nav, dashboard wireframe, Signal Card model, sources catalog, design language | None — **this** |
| **V1.1** | SignalTerrain bridge | Map receivers / incidents → observation / Signal Card shape; About/Limits surface | Local-only helpers |
| **V1.2** | Curated digest (offline) | Human-curated JSON bundles → calm digest UI (still no live monitor) | Optional local render |
| **V2** | Cited advisory path | First *read-only* cited sources (e.g. space weather + one cyber advisory class) with full provenance | Narrow connectors |
| **V2.1** | Four-panel dashboard | Changed / Important / Attention / Stable with real cards | Thin UI |
| **V3** | Module depth | Expand honest modules one at a time (radio conditions, cloud status, …) | Per-module |
| **Later** | Broader source mesh | NVD/CISA/status pages/BGP/outage providers as designed — only when editorial capacity exists | Gradual |

**Also see:** SignalTerrain [Intelligence Core roadmap](SIGNALTERRAIN-INTELLIGENCE-ROADMAP.md) (UIO → correlation → relevance → inventory → passive IDS → recommendations → bounded IPS).

---

## V1 deliverables (this work block)

| Deliverable | Location |
|-------------|----------|
| Vision | `docs/SIGNAL-INTELLIGENCE-VISION.md` |
| Architecture | `docs/SIGNAL-INTELLIGENCE-ARCHITECTURE.md` |
| Roadmap | this file |
| Modules catalog | `design-system/signal-intelligence/modules.json` |
| Navigation IA | `design-system/signal-intelligence/navigation.json` |
| Sources catalog | `design-system/signal-intelligence/sources-catalog.json` |
| Signal Card schema | `design-system/signal-intelligence/schema-v1.json` |
| Design language | `design-system/signal-intelligence/design-language.json` |
| Dashboard wireframe | `design-system/patterns/signal-intelligence-dashboard.html` |
| Registry / engine indexes | product-registry, PLATFORM-ENGINES, docs README |

**Explicitly not in V1:** live APIs, scanners, SOC UI, exploit content, production dashboard wiring, fake feeds.

---

## Priority order after V1

1. **Honesty surfaces** — About/Limits, Planned labels, empty states  
2. **Bridge existing SignalTerrain models** — receivers & incidents → Signal Card fields  
3. **One calm digest** from curated samples (space weather + radio conditions first)  
4. **Trust + Knowledge wiring** on Signal Card expand  
5. **First cited source** with verification status (prefer NOAA space weather or public cloud status — lower misuse risk than exploit feeds)  
6. **Four-panel dashboard** with density budget  
7. **Cyber advisory literacy** only after provenance + editorial workflow exist  

---

## Module sequencing (suggested)

| Wave | Modules | Rationale |
|------|---------|-----------|
| A | Space Weather · Radio Conditions · Knowledge Library | Fits ranger metaphor; RF home already exists |
| B | Infrastructure · Cloud Status · Internet Health · GPS Integrity | Public status pages; clear citations |
| C | Major Vulnerabilities · Technology News · Research | Needs strong editorial + Trust discipline |
| D | Threat Landscape · Active Exploitation · Ransomware | Highest misuse/fear risk — last, and literacy-only |
| E | Communications · future geopolitical *signal* layers | Only with explicit editorial standards |

Geopolitical layers, if ever added, are **signal awareness** (what communications / infrastructure conditions are reported) — never partisan advocacy or speculative conflict theater.

---

## Source onboarding gates

Before any feed is connected:

1. Named in `sources-catalog.json` with verification expectations  
2. Editorial owner assigned  
3. Mapping to Signal Card fields documented  
4. Failure mode defined (stale → label; missing → unknown; conflict → conflicts[])  
5. No exploit payload storage  
6. Playbook + Research Integrity review  

---

## AI on the roadmap

| When | What |
|------|------|
| V1 | Responsibilities only (Architecture) |
| V1.2+ | Optional assist on curated bundle summaries with `aiAssisted` |
| V2+ | Draft Perspective for human editors — never auto-publish unverified incidents |

No autonomous “threat hunter” agents.

---

## Explicit non-roadmap

These do not appear on any phase as goals:

- Vulnerability scanning products  
- Penetration testing suites  
- Malware sandboxes  
- Credential stuffing / attack simulation  
- Exploit PoC libraries  
- Hollywood SOC dashboards  

---

## Status vocabulary (shipping honesty)

| Label | Meaning |
|-------|---------|
| Blueprint | Designed only |
| Foundation | Contracts / local helpers |
| Planned | Intended; not available |
| Preview | Real but limited; labeled |
| Active | Honestly usable for stated scope |

Never advertise Planned modules as Available.

---

## Success criteria by phase

**V1:** Team shares one vision; implementers have contracts and wireframes.  
**V1.1:** A receiver/incident can populate a Signal Card without fake spectrum.  
**V2:** At least one cited live-or-bulletin source path with unknowns visible.  
**V2.1:** Dashboard answers the four questions without scrolling forever.  
**V3:** Two or more modules ship independently without schema forks.

---

## Related

- [SIGNAL-INTELLIGENCE-ENGINE.md](SIGNAL-INTELLIGENCE-ENGINE.md)  
- [SIGNAL-INTELLIGENCE-INTEGRATIONS.md](SIGNAL-INTELLIGENCE-INTEGRATIONS.md)  
- [SIGNALTERRAIN_PLAYBOOK.md](SIGNALTERRAIN_PLAYBOOK.md)  
- [ROADMAP.md](ROADMAP.md) — studio-wide roadmap
