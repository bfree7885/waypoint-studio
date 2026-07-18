# Exposure Analysis

**Runtime:** `analyzeExposure()` in `wds-signalterrain-cyber-advisor.js`  
**Match helper:** `WDS.signalTerrainInventory.matchEntity`  
**Schema:** `schema-exposure-v1.json`

---

## Chain

```
current intelligence (CVE)
        ↓ affects
known affected technologies (affected-software)
        ↓ inventory match
user inventory item
        ↓
recommended actions (defensive only)
```

---

## Match methods (transparent)

| Method | Status | Confidence |
|--------|--------|------------|
| `linkedEntityId` | matched | high |
| `name-overlap` | possible | moderate |
| `alias-tag` / `tag-in-title` | possible | moderate/low |
| `no-overlap` / `no-inventory-hit` | unlikely | low–moderate |

Never assume. Always explain:

- **This advisory matters because…** (`mattersBecause`)  
- **This advisory probably does not affect you because…** (`probablyDoesNotAffectBecause`)

Facts and inferences are separate arrays on each exposure.

---

## Priority

Uses the shared cyber priority engine when factors/rules are loaded, plus an explicit `inventory_match` contribution. No unexplained totals.
