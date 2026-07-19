# SignalTerrain — Provider Audit (Sprint 5)

## Live artifact providers

Sourced from `data/cyber/live.json` → `providers[]` (engine-generated). Typical set:

| Status | Examples |
| --- | --- |
| **ok** | CISA KEV, NVD, CISA advisories, Chrome releases, Ubuntu USN, GHSA, major cloud status feeds |
| **planned** | MFSA, MSRC, Apple, Cisco PSIRT, EPSS, M365 status — shown honestly, never faked as live |
| **error / timeout** | Surfaced in Feeds table and Overview trust strip |

## Trust UI (Sprint 5)

Overview shows:

- Artifact `trustState` (e.g. Live)
- Refresh timestamp (`meta.generatedAt`)
- Count of ok / cached / planned providers
- **Unavailable now** list when providers fail
- Link to `#feeds` health table

Per record:

- Provider name + id
- Source URL
- `retrievedAt`
- Confidence when present
- Ranking explanation + merge/dedupe note

## Boundaries

- Live path **refuses** sample/fixture URLs (`BANNED_SAMPLE_PATHS`)
- Recommendations are defensive decision support only — not scanning, exploit execution, SOC/IDS/IPS productization
