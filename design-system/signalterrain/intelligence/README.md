# SignalTerrain Intelligence Core

**Version:** 0.1.0 · **Status:** Architecture + summary prototype  
**Tagline:** What changed? Why does it matter? Who is affected? What should happen next?

Canonical docs:

- [SIGNALTERRAIN-INTELLIGENCE-CORE.md](../../../docs/SIGNALTERRAIN-INTELLIGENCE-CORE.md)
- [SIGNALTERRAIN-INTELLIGENCE-ROADMAP.md](../../../docs/SIGNALTERRAIN-INTELLIGENCE-ROADMAP.md)
- [SIGNALTERRAIN-CORRELATION-ENGINE.md](../../../docs/SIGNALTERRAIN-CORRELATION-ENGINE.md)
- [SIGNALTERRAIN-RECOMMENDATIONS.md](../../../docs/SIGNALTERRAIN-RECOMMENDATIONS.md)

## Artifacts

| Artifact | Path |
|----------|------|
| UIO schema | `schema-uio-v0.1.json` |
| Recommendation schema | `schema-recommendation-v0.1.json` |
| Provider interface | `schema-provider-v0.1.json` |
| Domains | `domains.json` |
| Providers (designed) | `providers.json` |
| Correlation patterns | `correlation-patterns.json` |
| Sample UIO bundle | `samples/uio-bundle.sample.json` |
| Sample recommendations | `samples/recommendations.sample.json` |
| Summary fixture | `samples/intelligence-summary.sample.json` |
| Summary UI | `apps/signalterrain/summary.html` |

## Rules

1. Reinforce the four questions.  
2. No IDS / IPS in this package.  
3. Recommendations never auto-execute (`autoExecute: false`).  
4. Samples stay labeled sample.  
5. Geopolitical items are structured events — not news articles.  
6. Prefer attaching UIOs to living topics (`st_*`).

## Demo

Open `apps/signalterrain/summary.html` for the Intelligence Summary prototype.
