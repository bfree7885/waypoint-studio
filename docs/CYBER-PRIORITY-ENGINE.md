# Cyber Priority Engine

**Status:** Architecture V0.1  
**Runtime:** `design-system/js/signalterrain/wds-signalterrain-cyber-priority.js`  
**Factors:** `priority-factors.json`  
**Rules:** `priority-rules.json`  
**Schema:** `schema-priority-score-v0.1.json`

---

## Principle

Never generate mysterious AI scores.

Priority is a **transparent sum** of labeled factor contributions. Every point includes a human-readable `reason`.

---

## Question answered

> What should I pay attention to today — and why?

Priority supports attention. It does **not** auto-remediate, auto-block, or claim certainty.

---

## Factors (max 100)

| Factor | Max | Meaning |
|--------|-----|---------|
| Known exploitation | 25 | none / historical / active |
| Severity | 20 | info → critical |
| Public exploit availability | 15 | Literacy only — never payloads |
| Patch availability | 10 | unavailable raises priority |
| Industry relevance | 10 | Observer overlap 0–10 |
| Recency | 10 | legacy / recent / current |
| Trusted source count | 5 | Government/vendor/standard citations |
| Owner interest | 5 | Local watchlist boost (on-device) |
| Confidence | 5 | Honesty weight |

Exact maps live in `priority-rules.json`.

---

## Bands

| Band | Range | Guidance |
|------|-------|----------|
| low | 0–24 | Informational hygiene |
| moderate | 25–49 | Plan within normal operations |
| high | 50–74 | Prioritize soon — human-paced |
| urgent | 75–100 | Rare; calm wording only |

### Caps

Urgent is blocked unless:

- Known exploitation is `historical` or `active`, **and**  
- At least two trusted citations are present  

This prevents theatrical urgency from thin evidence.

---

## Output shape

```json
{
  "total": 78,
  "band": "high",
  "contributions": [
    { "factorId": "known_exploitation", "points": 25, "reason": "…" }
  ],
  "summaryWhy": "…",
  "unknowns": ["…"]
}
```

UI must show contributions — not only the total.

---

## Relationship to recommendations

Intelligence Core recommendations (`rec_*`) remain the “what should happen next” guidance objects (`autoExecute: false`).

Priority scores answer **attention**. Recommendations answer **action suggestions**. They may reference the same `cy_*` / `uio_*` subjects.

---

## Future feeds

When KEV/CVE/advisory providers go live:

- Map KEV membership → `knownExploitation: "active"`  
- Map CVSS/attention labels carefully into `severity` without pretending CVSS is destiny  
- Count distinct trusted publishers into `trustedSourceCount`  
- Keep owner interest local  

Core scoring function stays stable.

---

## Related

- [CYBER-INTELLIGENCE-MODEL.md](CYBER-INTELLIGENCE-MODEL.md)  
- [SIGNALTERRAIN-RECOMMENDATIONS.md](SIGNALTERRAIN-RECOMMENDATIONS.md)  
- [WAYPOINT-CONFIDENCE-SYSTEM.md](WAYPOINT-CONFIDENCE-SYSTEM.md)
