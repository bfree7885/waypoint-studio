# Signal Intelligence Foundation (package)

**Version:** 1.0.0 · **Runtime:** none (architecture + schemas + wireframes only)  
**Foundation:** V1 product blueprint elevating engine v0.1 contracts

Canonical docs:

- [SIGNAL-INTELLIGENCE-VISION.md](../../docs/SIGNAL-INTELLIGENCE-VISION.md)
- [SIGNAL-INTELLIGENCE-ARCHITECTURE.md](../../docs/SIGNAL-INTELLIGENCE-ARCHITECTURE.md)
- [SIGNAL-INTELLIGENCE-ROADMAP.md](../../docs/SIGNAL-INTELLIGENCE-ROADMAP.md)
- [SIGNAL-INTELLIGENCE-ENGINE.md](../../docs/SIGNAL-INTELLIGENCE-ENGINE.md)
- [SIGNAL-INTELLIGENCE-INTEGRATIONS.md](../../docs/SIGNAL-INTELLIGENCE-INTEGRATIONS.md)
- [SIGNALTERRAIN_PLAYBOOK.md](../../docs/SIGNALTERRAIN_PLAYBOOK.md)

## Quick map

| Artifact | Path |
|----------|------|
| Package manifest | `index.json` |
| Observation schema (v0.1) | `schema-v0.1.json` |
| Signal Card schema (v1) | `schema-v1.json` |
| Modules catalog | `modules.json` |
| Navigation IA | `navigation.json` |
| Sources catalog (no connectors) | `sources-catalog.json` |
| Design language | `design-language.json` |
| Taxonomy | `taxonomy.json` |
| Confidence | `confidence.json` |
| Threat context phases | `threat-context.json` |
| Adaptive attention | `attention.json` |
| Sample observation | `samples/observation.sample.json` |
| Sample Signal Card | `samples/signal-card.sample.json` |
| Dashboard wireframe | `../patterns/signal-intelligence-dashboard.html` |

## Developer rules

1. **No fake feeds** — do not invent CVEs, outages, ADS-B tracks, or spectrum hits.
2. **Awareness platform** — not SOC, not pentest, not scanner, not hacking toolkit.
3. **Calm attention** — pair elevated severity with `calmGuidance`.
4. **Unknowns required** — every observation / Signal Card lists gaps.
5. **Privacy first** — coarse location by default; precise receiver coords opt-in later.
6. **Legal listening** — public-safety topics carry compliance notes.
7. **AI optional** — set `meta.aiAssisted` when used; still cite sources.
8. **Perspective labeled** — never silently merge Waypoint Perspective with source summary.
9. **No parallel Cyber nav product** — SignalTerrain remains the UI home.

## Future runtime (not started)

A later collector/digest may:

1. Ingest cited advisories or private receiver logs.
2. Normalize into observation / Signal Card shapes.
3. Apply attention weights from `attention.json`.
4. Hand SignalTerrain a calm digest ordered by attention + freshness.
5. Populate the four-panel dashboard (Changed / Important / Attention / Stable).

Until then, treat this package as **contracts, documentation, and wireframes only**.
