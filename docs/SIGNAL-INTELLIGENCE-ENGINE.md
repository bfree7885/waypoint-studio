# Signal Intelligence Engine

**Status:** Architecture / schemas (Foundation V1 blueprint; observation contract from v0.1)  
**Package:** `design-system/signal-intelligence/`  
**Primary product home:** SignalTerrain  

**Product vision:** [SIGNAL-INTELLIGENCE-VISION.md](SIGNAL-INTELLIGENCE-VISION.md)  
**Architecture:** [SIGNAL-INTELLIGENCE-ARCHITECTURE.md](SIGNAL-INTELLIGENCE-ARCHITECTURE.md)  
**Roadmap:** [SIGNAL-INTELLIGENCE-ROADMAP.md](SIGNAL-INTELLIGENCE-ROADMAP.md)

This document remains the **engine contract** detail (observation, taxonomy, confidence, attention, ethics). Foundation V1 adds product-family vision, modules, Signal Card, nav, dashboard wireframe, and sources catalog — still **no** dashboards wired to live feeds, APIs, monitoring, SDR UI, or cyber tools.

---

## Mission

Help people **observe and understand invisible environments** — physical radio and everyday digital conditions — so they leave with greater understanding, not more anxiety.

The engine should make it possible to answer:

| Question | Schema home |
|----------|-------------|
| What is happening? | `summary` |
| Why does it matter? | `explanation` + `attention.whyItMatters` |
| What should I pay attention to? | `attention.focus` + adaptive attention model |
| What has changed? | `attention.whatChanged` + `historicalComparison` |
| How confident are we? | `confidence` + `unknowns` + `conflicts` |
| How trustworthy / verified? | Signal Card `verification` + Trust labels |
| What should I understand before deciding? | `waypointPerspective` + related knowledge |

---

## Purpose

Unify **RF**, **cyber**, and **infrastructure** awareness under one educational observation / Signal Card contract that SignalTerrain (and later peers) can share.

---

## Scope

| In scope | Out of scope (non-goals) |
|----------|---------------------------|
| Observation schema (v0.1) | Live API connections |
| Signal Card schema (v1) | Monitoring services / scanners |
| Domain taxonomy | SDR interfaces / demodulator UI |
| Confidence framework | Enterprise SOC / SIEM |
| Threat-context phases | Penetration testing / exploit kits |
| Adaptive attention model | Placeholder threat dashboards |
| Modules / nav / sources catalogs | Fabricated incidents |
| Integration contracts | Surveillance of people |
| Ethics & privacy philosophy | Hacking tutorials / PoCs |

---

## Architecture

```
Sources (future: user logs, cited advisories, status pages)
        │
        ▼
 Observation (schema-v0.1) ──► Signal Card (schema-v1)
   ├── domain / category / taxonomy / moduleId
   ├── severity + attention (calm)
   ├── confidence dimensions (+ Trust label)
   ├── threatContext phase
   ├── evidence · verification · related · historicalComparison
   ├── waypointPerspective · relatedKnowledgeIds
   └── unknowns · conflicts
        │
        ├── Adaptive attention (weights / focus areas)
        ▼
 Consumers (SignalTerrain first; Dashboard / OIE / Scenes / LIE later)
```

Engines compose; they are not standalone nav apps. Signal Intelligence remains a **shared capability** with SignalTerrain as UI home when products arrive.

---

## Knowledge model

### Domains

1. **Radio Frequency Intelligence** — SDR literacy, NOAA, amateur radio, AIS, ADS-B, satellites, broadcast, legal public-safety awareness, frequency activity, propagation  
2. **Cyber Intelligence** — CVEs, advisories, campaign literacy, outages (ISP/DNS/BGP), certificates, releases, patch awareness  
3. **Infrastructure Intelligence** — internet/cloud/CDN status, GPS interference, space weather, cellular issues  

Full vocabulary: `design-system/signal-intelligence/taxonomy.json`.  
Modules: `modules.json`.

### Observation & Signal Card

- Observation: `https://waypoint.studio/schemas/signal-intelligence/observation/v0.1`  
- Signal Card: `https://waypoint.studio/schemas/signal-intelligence/signal-card/v1`

Required honesty fields include confidence block, evidence list, threat-context phase, verification (v1), Waypoint Perspective (v1), and **at least one unknown**.

### Threat context

Phases: current · emerging · resolved · historical patterns · seasonal trends  
(`threat-context.json`) — timeline framing, not actor dossiers.

### Adaptive attention

Focus areas raise educational visibility when matching observations appear. Tone rules forbid SOS-style alarmism (`attention.json`).

### Confidence

Levels align with Landscape Interpretation naming (`high` → `insufficient`) but measure **support for an awareness claim**, with separate dimensions for evidence quality, freshness, and source reliability (`confidence.json`).

UI should prefer platform Trust recommendation labels via `design-system/trust/confidence-map.json` (`engineCrosswalk`).

---

## Design philosophy

- Awareness, not anxiety  
- Guide and explain; do not score fear  
- Educational for individuals, hobbyists, homelabs, small orgs  
- **Not** a penetration testing platform  
- **Not** a hacking toolkit  
- **Not** an enterprise SOC  
- **Not** a vulnerability scanner  

---

## Ethical principles

1. Never fabricate signals, incidents, advisories, or outages.  
2. Never ship exploit PoCs or attack procedures.  
3. Encourage lawful radio practices; attach legality notes where relevant.  
4. Distinguish rumor from cited primary sources.  
5. Prefer calm guidance (update, backup, retune) over dramatic severity theater.  
6. Do not claim protective guarantees (“you are secured if you open this app”).

---

## Privacy philosophy

- Private receivers, audio, and precise locations stay local by default.  
- Shared maps and community receivers remain **opt-in**.  
- Location precision enum defaults toward region/grid — precise coordinates require explicit future consent flows.  
- Cyber digests should not require uploading home-network inventories.

Aligns with the Waypoint Constitution privacy philosophy and SignalTerrain Playbook.

---

## Limitations

- Foundation V1 is contracts + wireframes — no collectors.  
- Sample observation / Signal Card are educational, with speculative / preliminary confidence.  
- Taxonomy breadth exceeds any implemented source.  
- Public-safety RF categories are placeholders for legal-aware curriculum, not a receive mandate.

---

## Roadmap

See [SIGNAL-INTELLIGENCE-ROADMAP.md](SIGNAL-INTELLIGENCE-ROADMAP.md). Short form:

| Phase | Goal |
|-------|------|
| **v0.1** | Schemas, taxonomy, confidence, attention, threat context |
| **V1** | Vision, architecture, modules, Signal Card, nav, dashboard wireframe, sources catalog |
| V1.1 | SignalTerrain foundation bridge (receivers/incidents → Signal Card) |
| V1.2 | Offline digest from curated JSON bundles |
| V2 | Narrow cited advisory path with provenance |
| V2.1 | Four-panel dashboard with real cards |

---

## Integrations

See [SIGNAL-INTELLIGENCE-INTEGRATIONS.md](SIGNAL-INTELLIGENCE-INTEGRATIONS.md).

---

## See also

- [PLATFORM-ENGINES.md](PLATFORM-ENGINES.md)  
- [SIGNALTERRAIN_PLAYBOOK.md](SIGNALTERRAIN_PLAYBOOK.md)  
- [WAYPOINT-TRUST-FRAMEWORK.md](WAYPOINT-TRUST-FRAMEWORK.md)  
- [WAYPOINT-KNOWLEDGE-PLATFORM.md](WAYPOINT-KNOWLEDGE-PLATFORM.md)  
- [LANDSCAPE-INTERPRETATION-ENGINE.md](LANDSCAPE-INTERPRETATION-ENGINE.md)  
- Package README: `design-system/signal-intelligence/README.md`
