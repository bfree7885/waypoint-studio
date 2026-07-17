# Waypoint Trust & Transparency Framework V1

**Status:** Active foundation  
**Tagline:** Show people not just what we know — but why we believe it.  
**Audience:** Every product surface, editor, and future explainable recommendation  

This framework makes Waypoint **transparent, explainable, and trustworthy**.

It does **not** add features for their own sake.  
It does **not** redesign navigation.  
It does **not** invent a new AI system.

It defines how every recommendation and knowledge claim earns trust.

---

## Mission

Users should never wonder:

- “Where did this information come from?”  
- “Why is the app recommending this?”  
- “How confident is it?”  
- “Is this research or AI?”  

Every important recommendation should be explainable.  
**Trust is earned through transparency.**

---

## Principle

Waypoint never asks users to trust AI — or any model — blindly.

Waypoint shows:

1. What was observed  
2. What evidence supports it  
3. How confident we are  
4. Where uncertainty exists  
5. Where users can learn more  

Inherits: [Constitution](WAYPOINT-CONSTITUTION.md) · [Research Integrity](RESEARCH-INTEGRITY.md) · [Guide Experience](WAYPOINT-GUIDE-EXPERIENCE.md).

---

## Document map

| Document | Role |
|----------|------|
| **This file** | Trust philosophy & product contract |
| [Evidence Model](WAYPOINT-EVIDENCE-MODEL.md) | Evidence kinds, source layers, Evidence Card |
| [Confidence System](WAYPOINT-CONFIDENCE-SYSTEM.md) | Shared confidence terminology (no fake precision) |
| [Research Integrity](RESEARCH-INTEGRITY.md) | Runtime badges, footnotes, OIP/WOS adapters |

---

## Shared trust model (every recommendation)

When Waypoint suggests a search area, critique cue, ID likelihood, or advisory framing, the user should be able to open an explanation that includes:

| Section | Purpose |
|---------|---------|
| **What we’re seeing / Today’s suggestion** | Plain-language claim |
| **Confidence** | Shared label (not a decorative percentage) |
| **Based on** | Evidence checklist — what supported the claim |
| **Uncertainty** | What weakens it or is missing |
| **Sources** | Primary references when available |
| **Last updated** | Freshness |
| **Related research** | Optional deeper reading (`wk_*`) |
| **Why this matters** | Field / product relevance |

Example shape (Sheds):

```text
Today’s search context
Confidence: Moderate

Based on
✓ Last 72 hours of weather
✓ Terrain orientation
✓ Historical habitat patterns
✓ Deer biology research

Uncertainty
• Few recent local observations
• Wind forecast may change

Sources
• State wildlife guidance…
• NOAA…
```

---

## Source transparency — never blur

Every important claim should identify its **epistemic kind**:

| Kind | Meaning |
|------|---------|
| Observed data | Measured or recorded conditions |
| Prediction | Model or forecast output |
| Research | Published research summary |
| Historical record | Past observations / archives |
| Editorial interpretation | Waypoint Perspective |
| AI synthesis | Model-assisted wording (must say so) |
| User observation | The user’s own record |
| Government source | Agency / advisory |
| Professional organization | Society / standards body |
| Unknown | Honesty when provenance is missing |

Full model: [Evidence Model](WAYPOINT-EVIDENCE-MODEL.md).

---

## Explainability checklist (AI & models)

Every AI-assisted or model-assisted insight should answer:

1. Why did we reach this conclusion?  
2. What evidence supports it?  
3. What evidence weakens it?  
4. What assumptions were made?  
5. What information is missing?  

If those cannot be answered honestly — **do not present the claim as confident**.

---

## Uncertainty is normal

Waypoint should comfortably say:

- “We don’t know.”  
- “Evidence is mixed.”  
- “Research disagrees.”  
- “Conditions are changing.”  
- “A prediction is currently unreliable.”  

Silence and humility build more trust than false certainty.

---

## Product applications

| Product | Transparency focus |
|---------|-------------------|
| **Sheds** | Why an area may matter — not only where |
| **Photo Coach** | Why a cue was raised — not only a relative reading |
| **Fieldry** | Separate confirmed from likely identification |
| **SignalTerrain** | Confirmed events vs developing situations; name primary sources |
| **Future intelligence** | Separate observation · analysis · scenario · opinion · speculation · prediction |

---

## Shared metadata (forward-compatible)

Knowledge items and recommendations should support over time:

Confidence · Evidence quality · Primary source count · Last reviewed · Review status · Editorial owner · Verification status · Revision history  

Schema seed: `design-system/trust/schema-v1.json`  
UI: `WDS.evidenceCard` · `design-system/patterns/evidence-card.html`

Future automation inherits these fields — do not invent parallel trust systems per app.

---

## Runtime foundation

Prefer existing Research Integrity chips/footnotes for compact surfaces.

Use the **Evidence Card** when a recommendation needs a full explanation:

```js
mount.innerHTML = WDS.evidenceCard.render({
  title: "Today’s search context",
  claim: "South-facing pockets may warm earlier after mild nights.",
  confidence: "moderate",
  basedOn: ["Last 72 hours of weather", "Terrain orientation", "Winter habitat research"],
  uncertainty: ["Few recent local observations", "Wind forecast may change"],
  sources: [{ label: "Demonstration fixture — not a live agency brief" }],
  whyItMatters: "Relative warmth can shift winter movement — never a find guarantee.",
  lastUpdated: "2026-07-16",
  products: ["sheds"]
});
```

---

## Success criteria

Users should feel:

- “I understand why the app believes this.”  
- “I know what information it used.”  
- “I know where uncertainty exists.”  
- “I can verify the original source.”  
- “I trust Waypoint because it explains itself.”  

Waypoint should be known for **thoughtful transparency** — not merely accurate predictions.

---

## Related

- [Evidence Model](WAYPOINT-EVIDENCE-MODEL.md)  
- [Confidence System](WAYPOINT-CONFIDENCE-SYSTEM.md)  
- [Research Integrity](RESEARCH-INTEGRITY.md)  
- [Knowledge Platform](WAYPOINT-KNOWLEDGE-PLATFORM.md)  
- [Worth Noticing Engine](WAYPOINT-OBSERVATION-ENGINE.md)  
- [Constitution](WAYPOINT-CONSTITUTION.md)  
