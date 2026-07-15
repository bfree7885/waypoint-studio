# Signal Intelligence Engine v0.1

**Status:** Architecture / schemas (no dashboards, APIs, monitoring, SDR UI, or cyber tools)  
**Package:** `design-system/signal-intelligence/`  
**Primary product home:** SignalTerrain

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

---

## Purpose

Unify **RF**, **cyber**, and **infrastructure** awareness under one educational observation contract that SignalTerrain (and later peers) can share.

---

## Scope (v0.1)

| In scope | Out of scope (non-goals) |
|----------|---------------------------|
| Observation schema | Live API connections |
| Domain taxonomy | Monitoring services |
| Confidence framework | SDR interfaces / demodulator UI |
| Threat-context phases | Enterprise SOC / SIEM |
| Adaptive attention model | Penetration testing / exploit kits |
| Integration contracts | Placeholder threat dashboards |
| Ethics & privacy philosophy | Surveillance of people |

---

## Architecture

```
Sources (future: user logs, cited advisories, status pages)
        │
        ▼
 Signal Intelligence Observation (schema-v0.1)
   ├── domain / category / taxonomy
   ├── severity + attention (calm)
   ├── confidence dimensions
   ├── threatContext phase
   ├── evidence · related · historicalComparison
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

### Observation

Canonical schema:  
`https://waypoint.studio/schemas/signal-intelligence/observation/v0.1`

Required honesty fields include confidence block, evidence list, threat-context phase, and **at least one unknown**.

### Threat context

Phases: current · emerging · resolved · historical patterns · seasonal trends  
(`threat-context.json`) — timeline framing, not actor dossiers.

### Adaptive attention

Focus areas (browser hygiene, navigation reliability, radio impacts, backup reminders, connectivity, legal listening) raise educational visibility when matching observations appear. Tone rules forbid SOS-style alarmism (`attention.json`).

### Confidence

Levels align with Landscape Interpretation naming (`high` → `insufficient`) but measure **support for an awareness claim**, with separate dimensions for evidence quality, freshness, and source reliability (`confidence.json`).

---

## Design philosophy

- Awareness, not anxiety  
- Explain and teach; do not score fear  
- Educational for individuals, hobbyists, homelabs, small orgs  
- **Not** a penetration testing platform  
- **Not** a hacking toolkit  
- **Not** an enterprise SOC  

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

- v0.1 is contracts only — no collectors.  
- Sample observation is educational, with speculative confidence.  
- Taxonomy breadth exceeds any implemented source.  
- Public-safety RF categories are placeholders for legal-aware curriculum, not a receive mandate.

---

## Roadmap (documentation intent)

| Phase | Goal |
|-------|------|
| **v0.1** | Schemas, taxonomy, confidence, attention, threat context (**this**) |
| v0.2 | Offline digest builder from **user-supplied** or curated JSON bundles (still no live monitor) |
| v0.3 | SignalTerrain foundation bridge (receivers/incidents → observation shape) |
| v0.4 | Optional cited advisory ingest with provenance — cyber educational digests |
| v1.0 | Thin SignalTerrain surfaces with confidence, unknowns, and calm attention always visible |

---

## Integrations

See [SIGNAL-INTELLIGENCE-INTEGRATIONS.md](SIGNAL-INTELLIGENCE-INTEGRATIONS.md).

---

## See also

- [PLATFORM-ENGINES.md](PLATFORM-ENGINES.md)  
- [SIGNALTERRAIN_PLAYBOOK.md](SIGNALTERRAIN_PLAYBOOK.md)  
- [LANDSCAPE-INTERPRETATION-ENGINE.md](LANDSCAPE-INTERPRETATION-ENGINE.md)  
- Package README: `design-system/signal-intelligence/README.md`
