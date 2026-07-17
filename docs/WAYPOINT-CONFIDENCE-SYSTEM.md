# Waypoint Confidence System

**Status:** Active foundation  
**Part of:** [Trust & Transparency Framework](WAYPOINT-TRUST-FRAMEWORK.md)  
**Map file:** `design-system/trust/confidence-map.json`

Confidence tells users **how strongly the available evidence supports a claim**.

It is **not** a probability of finding sheds, spotting a species, or taking a perfect photo.  
It is **not** decorative precision.

---

## Principle — avoid fake precision

Do **not** default to scores like “82%” unless:

1. The number is defined,  
2. The method is explainable, and  
3. Uncertainty is still shown in words.

Prefer shared **labels**. Optional numeric bands are secondary and must map to a label.

---

## Shared confidence terminology (recommendations & interpretations)

Use these labels in Evidence Cards and Worth Noticing / model explanations:

| Id | Label | Meaning |
|----|-------|---------|
| `very-high` | Very High | Multiple independent, high-quality lines agree; alternatives are weak |
| `high` | High | Well supported; remaining doubt is limited |
| `moderate` | Moderate | Plausible; competing explanations remain reasonable |
| `limited` | Limited | Thin or single-thread support |
| `preliminary` | Preliminary | Early signal; conditions or data still changing |
| `unknown` | Unknown | Not enough to say — prefer silence or explicit “unknown” |

Aligned with Landscape Interpretation / Signal Intelligence `high|moderate|low|speculative|insufficient`, mapped in `confidence-map.json`.

---

## Observation confidence (WOS)

For user / field observations, keep WOS vocabulary:

| Id | Label |
|----|-------|
| `certain` | Certain |
| `likely` | Likely |
| `possible` | Possible |
| `uncertain` | Uncertain |
| `not_recorded` | (omit from UI by default) |

Runtime: `WDS.researchIntegrity.renderConfidence(level)`.

---

## Mapping table (do not invent a third scale per app)

| Context | Use |
|---------|-----|
| WOS / Fieldry ID notes | WOS levels |
| Sheds search explanation | Shared recommendation labels |
| Photo Coach critique cues | Shared labels (relative readings are not person-grades) |
| Worth Noticing | Shared labels (`confidenceLabel` on `wn_*`) |
| Landscape / Signal engines | Engine `confidence.json` → map to shared labels |
| Curated knowledge | Editorial certainty via reviewStatus + Perspective limitations |

`design-system/trust/confidence-map.json` is the machine-readable map.

---

## How confidence is earned

Confidence rises when:

- Evidence is specific and recent  
- Multiple independent sources agree  
- Methods are transparent  
- Contradictions are acknowledged  

Confidence falls when:

- Local observations are missing  
- Forecasts are volatile  
- Sources conflict  
- The claim is extrapolated beyond the data  

**Unknown / silence** is better than inflated “High.”

---

## Future AI explainability standard

When AI assists:

1. Map output confidence to a **shared label**  
2. List supporting and weakening evidence  
3. Name assumptions  
4. Label `ai-synthesis` when wording is model-assisted  
5. Never present speculative text as `very-high`  

See: [Trust Framework](WAYPOINT-TRUST-FRAMEWORK.md) · [AI Principles](WAYPOINT-AI-PRINCIPLES.md).

---

## Related

- [Trust Framework](WAYPOINT-TRUST-FRAMEWORK.md)  
- [Evidence Model](WAYPOINT-EVIDENCE-MODEL.md)  
- [Research Integrity](RESEARCH-INTEGRITY.md)  
- [Observation Standard](WAYPOINT-OBSERVATION-STANDARD.md)  
