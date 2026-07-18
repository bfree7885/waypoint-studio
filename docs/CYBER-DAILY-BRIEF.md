# Cyber Daily Brief

**Status:** V0.1  
**Surface:** `apps/signalterrain/cyber/brief.html`  
**Engine:** [CYBER-BRIEFING-ENGINE.md](CYBER-BRIEFING-ENGINE.md)

---

## Question

> What should I pay attention to today?

The brief is a calm editorial composition — not a live SOC ticker.

---

## Sections

| Section | Selection idea |
|---------|----------------|
| Today's Summary | Generated narrative from profile, scenario, high-item and change counts |
| New Since Yesterday | Entities with detected change events vs prior snapshot |
| Highest Priority Items | High / urgent bands (or moderate band on quiet-day) with full explanations |
| New Vulnerabilities | CVE / vulnerability kinds |
| Active Exploitation | Exploitation-linked kinds; may be forced empty on quiet-day |
| Major Vendor Advisories | `vendor-advisory` |
| Patch Highlights | `patch` / `mitigation` |
| Emerging Trends | Campaigns / ransomware families (scenario-aware) |
| Research Worth Reading | Citation + research workspace queue with estimated minutes |
| Things To Watch | Entities with explainability `watch` notes |
| Confidence Summary | Counts of confidence labels — separate from severity |

Every section handles empty data with messages from `empty-states.json`.

---

## Dashboard panels

Calm anchors (no flashing, no all-red chrome):

- Today's Brief  
- Priority Changes  
- Trending Topics  
- Threat Landscape  
- Vendor Activity  
- Learning Corner  
- Recently Updated  
- Saved Research  

Warning color is reserved for **urgent** band only after priority caps pass.

---

## Audience profiles

Profiles change **emphasis**, never facts:

- General technology users  
- Home lab enthusiasts  
- Linux users  
- Developers  
- IT administrators  
- Educators  
- Researchers  
- Small businesses  

UI: profile + scenario selectors regenerate via `generateBrief()`.

---

## Timeline awareness

When a prior snapshot is supplied, ingest `detectChanges` can surface:

- Severity revised  
- Patch released  
- Exploitation confirmed  
- Additional products / references  

“New Since Yesterday” and each item’s **What changed?** field show the human-readable deltas.

---

## Reading queue

Recommendations carry:

- Category (vendor, government, academic, technical, standards, historical)  
- Estimated reading minutes  
- Source attribution / citations  

---

## Samples

Open `brief.html?scenario=quiet-day&profile=general-tech` (and other scenario/profile pairs) to demonstrate adaptation of the same engine.
