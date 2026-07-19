# Savant — Recommendation Engine Documentation

**Date:** 2026-07-18

## Inputs

- Palate affinities (grapes, regions, producers, styles, traits)
- Catalog educational traits (acidity, oak, flavors, similar ids)
- Avoidance signals from lower ratings
- Preferred spend (average purchase price)

## Output shape

```json
{
  "items": [
    { "entry": {}, "score": 12, "why": "…", "reasons": ["…"], "confidence": "emerging" }
  ],
  "honesty": "…"
}
```

## Rules

- Never rank by star ratings alone.
- Always attach a prose why (reasons joined).
- When palate confidence is low, label recommendations as teaching starters.
- Exclude wines already in the cellar by name when possible.

## Extensibility

`affinityForEntry` is the primary hook for new signals (season, occasion, blend composition). Add weights in the palate builder, then consume in recommend — keep explainability strings next to score deltas.
