# Waypoint Evidence Model

**Status:** Active foundation  
**Part of:** [Trust & Transparency Framework](WAYPOINT-TRUST-FRAMEWORK.md)  
**Runtime:** `WDS.evidenceCard` · schema `design-system/trust/schema-v1.json`

This document defines **what counts as evidence**, how sources are typed, and how Evidence Cards present them.

---

## Principle

Evidence is what a careful guide would show you on the trail — not a pile of badges, not a black-box score.

Separate:

| Layer | Question |
|-------|----------|
| **Claim** | What are we saying? |
| **Evidence** | What supports it? |
| **Uncertainty** | What weakens or is missing? |
| **Source** | Who said / measured it? |
| **Interpretation** | What does Waypoint conclude? |

Never merge Source Summary with Waypoint Perspective (see Knowledge Platform).

---

## Evidence kinds

| Kind | Examples |
|------|----------|
| `observed-data` | Weather station readings, gauge stage, user WOS record |
| `prediction` | Forecast, phenology index, habitat model output |
| `research` | Peer-reviewed or extension summary |
| `historical-record` | Past seasons, archived observations |
| `editorial-interpretation` | Waypoint Perspective |
| `ai-synthesis` | Model-assisted wording (must be labeled) |
| `user-observation` | The signed-in user’s own note |
| `government` | Agency advisory, NOAA, wildlife agency |
| `professional-organization` | Standards body, professional society |
| `unknown` | Provenance missing — say so |

These align with curated Knowledge `sourceType` values where applicable.

---

## Evidence checklist items (“Based on”)

Each supporting line should be:

- Specific (“Last 72 hours of weather”) not vague (“AI”)  
- Falsifiable where possible  
- Optional deep link to research (`wk_*`) or original URL  

Weakening lines belong under **Uncertainty**, not “Based on.”

---

## Evidence Card (shared UI)

### Sections

1. Title / claim context  
2. Confidence (shared label)  
3. Based on (evidence checklist)  
4. Uncertainty / limitations  
5. Sources  
6. Last updated  
7. Why this matters (optional)  
8. Related research (optional)  
9. Applicable products (optional)

### Rules

- Calm, editorial, dismissible when inline  
- No alert styling, no “breaking” language  
- Prefer labels over fake percentages  
- Hide empty sections  
- Demonstration fixtures must say so  

### API

```js
WDS.evidenceCard.render(spec);
WDS.evidenceCard.toResearchIntegrity(spec); // compact footnote context when useful
```

CSS: `design-system/css/wds-evidence-card.css`  
Pattern: `design-system/patterns/evidence-card.html`

Compact surfaces may still use `WDS.researchIntegrity.renderFootnote()` — Evidence Card is for full explainability.

---

## Metadata for knowledge & recommendations

Forward-compatible fields (schema):

| Field | Role |
|-------|------|
| confidence | Shared confidence id |
| evidenceQuality | excellent → none / not_assessed (WOS) |
| basedOn | string[] evidence lines |
| uncertainty | string[] |
| sources | `{ label, url?, kind?, accessedAt? }[]` |
| primarySourceCount | derived or editorial |
| lastUpdated / dateReviewed | freshness |
| reviewStatus | verified · editorial-draft · demonstration · archived · needs-review |
| editorialOwner | optional human steward |
| verificationStatus | WOS verification when applicable |
| relatedResearch | `wk_*` ids |
| products | applicable apps |
| epistemicKind | evidence kind of the *claim* |

---

## Editorial process (evidence)

1. Prefer primary sources  
2. Count independent lines of support  
3. Record what is missing  
4. Update `lastUpdated` on change  
5. Archive when superseded  

Details: [Waypoint Editorial Standards](WAYPOINT-EDITORIAL-STANDARDS.md) · [Research Integrity](RESEARCH-INTEGRITY.md).

---

## Related

- [Trust Framework](WAYPOINT-TRUST-FRAMEWORK.md)  
- [Confidence System](WAYPOINT-CONFIDENCE-SYSTEM.md)  
- [Knowledge Platform](WAYPOINT-KNOWLEDGE-PLATFORM.md)  
