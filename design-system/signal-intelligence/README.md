# Signal Intelligence Engine (package)

**Version:** 0.1.0 · **Runtime:** none (architecture + schemas only)

Canonical docs:

- [SIGNAL-INTELLIGENCE-ENGINE.md](../../docs/SIGNAL-INTELLIGENCE-ENGINE.md)
- [SIGNAL-INTELLIGENCE-INTEGRATIONS.md](../../docs/SIGNAL-INTELLIGENCE-INTEGRATIONS.md)
- [SIGNALTERRAIN_PLAYBOOK.md](../../docs/SIGNALTERRAIN_PLAYBOOK.md)

## Quick map

| Artifact | Path |
|----------|------|
| Package manifest | `index.json` |
| Observation schema | `schema-v0.1.json` |
| Taxonomy | `taxonomy.json` |
| Confidence | `confidence.json` |
| Threat context phases | `threat-context.json` |
| Adaptive attention | `attention.json` |
| Sample observation | `samples/observation.sample.json` |

## Developer rules

1. **No fake feeds** — do not invent CVEs, outages, ADS-B tracks, or spectrum hits.
2. **Educational situational awareness** — not SOC, not pentest, not hacking toolkit.
3. **Calm attention** — pair elevated severity with `calmGuidance`.
4. **Unknowns required** — every observation lists gaps.
5. **Privacy first** — coarse location by default; precise receiver coords opt-in later.
6. **Legal listening** — public-safety topics carry compliance notes.
7. **AI optional** — set `meta.aiAssisted` when used; still cite sources.

## Future runtime (not started)

A later collector/digest may:

1. Ingest cited advisories or private receiver logs.
2. Normalize into `schema-v0.1` observations.
3. Apply attention weights from `attention.json`.
4. Hand SignalTerrain a calm digest ordered by attention + freshness.

Until then, treat this package as **contracts and documentation only**.
