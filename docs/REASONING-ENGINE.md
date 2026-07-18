# Reasoning Engine (Adaptive Defense Advisor)

**Status:** V1.0  
**Runtime:** `WDS.signalTerrainCyberAdvisor`

---

## Question answered

> What should I do differently today?

---

## Modules

| Function | Role |
|----------|------|
| `analyzeExposure` | Inventory ∩ graph |
| `generateRecommendations` | Defensive `rec_*` objects |
| `assessPosture` | Living posture rows |
| `detectSeason` | Educational season label |
| `generateDailyAdvisor` | Compressed daily package |
| `diffSnapshots` | What changed vs yesterday |
| `explainRecommendation` | Why / tech / sources / confidence / assumptions / missing / facts / inferences |
| `simulateDefensiveChange` | Architecture stub only |

---

## Assumptions (documented)

- Inventory is owner-maintained (manual) unless future discovery fills it.  
- Sample intelligence may be historical teaching cases.  
- Absence of inventory match ≠ eternal safety.  
- Priority factors come from the shared engine — advisor adds only labeled `inventory_match`.  
- Recommendations never `autoExecute`.  
- Simulation refuses unsupported predictions (`confidence: insufficient`).

---

## Expansion points

- Automated inventory discovery agents (schema `discovery: future-automated`)  
- Full what-if mutators per `simulation-architecture.json`  
- Cross-domain inventory reuse for RF/SDR modules  
- Stronger season models fed by ingest change events  

---

## Forbidden

Unexplained scores · offensive actions · hidden uncertainty · panic language
