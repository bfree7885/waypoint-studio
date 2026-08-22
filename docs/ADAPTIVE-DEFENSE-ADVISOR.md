# Adaptive Cyber Defense Advisor

**Status:** Strategic Reasoning Engine V1.0  
**UI:** `apps/signalterrain/cyber/advisor.html`  
**Runtime:** `design-system/js/signalterrain/wds-signalterrain-cyber-advisor.js`  
**Package:** `design-system/signalterrain/intelligence/cyber/advisor/`

---

## Mission

Help users continuously answer:

> What should I do differently today?

Not every cyber event. Adaptive recommendations from current intelligence × environment × inventory — educational, defensive, explainable, privacy-first.

---

## Architecture (shared services)

```
┌──────────────────────────────┐
│ advisor.html / mountAdvisor  │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│ cyber-advisor.js             │
│ exposure · recommendations · │
│ posture · seasons · daily ·  │
│ what-changed · explain       │
└───┬─────────┬───────────┬────┘
    │         │           │
    ▼         ▼           ▼
 cyber-graph  priority   inventory.js (shared)
 neighbors    score()    matchEntity()
    │         │           │
    └─────────┴───────────┘
         recommendation schema (rec_*)
         research / localStorage snapshots
```

**Do not duplicate** graph traversal, priority factor maps, or recommendation contracts. Inventory is a shared platform service for future RF/SDR modules.

---

## Decision path (summary)

1. Load editable **security profile** (multi-environment + risk tolerance).  
2. Load **technology inventory** (manual V1; schema ready for future discovery).  
3. **Exposure analysis** joins inventory → `affected-software` → CVE/`affects` → patches.  
4. Each exposure explains *matters because* / *probably does not affect* with facts vs inferences.  
5. **Recommendations** (`rec_*`, `autoExecute: false`) cite public guidance only.  
6. **Posture** categories report status, gaps, improvements, confidence (honest insufficient when unknown).  
7. **Cyber season** labels the educational landscape mood.  
8. **Daily advisor** compresses to ~3 changes, ~3 actions, safe-to-ignore, learning, review minutes.  
9. **What changed?** diffs local advisor snapshots.  
10. **Simulation** returns architecture stub — refuses unsupported predictions.

---

## Related docs

- [SIGNALTERRAIN-DYNAMIC-DEFENSIVE-POSTURE-ENGINE.md](SIGNALTERRAIN-DYNAMIC-DEFENSIVE-POSTURE-ENGINE.md) — architecture for dynamic daily posture deltas (**design only; not implemented in that doc’s branch**)  
- [SECURITY-PROFILES.md](SECURITY-PROFILES.md)  
- [EXPOSURE-ANALYSIS.md](EXPOSURE-ANALYSIS.md)  
- [CYBER-SEASONS.md](CYBER-SEASONS.md)  
- [REASONING-ENGINE.md](REASONING-ENGINE.md)  
- [SIGNALTERRAIN-RECOMMENDATIONS.md](SIGNALTERRAIN-RECOMMENDATIONS.md)
