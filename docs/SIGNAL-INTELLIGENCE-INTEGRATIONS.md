# Signal Intelligence — Application Integrations

**Engine:** Foundation V1 architecture (no shipped live UI or APIs)  
**Package:** `design-system/signal-intelligence/`

Consumers should share the observation / Signal Card contract — they must not invent parallel “alert” schemas that drop confidence, unknowns, verification, or calm guidance.

Product blueprint: [VISION](SIGNAL-INTELLIGENCE-VISION.md) · [ARCHITECTURE](SIGNAL-INTELLIGENCE-ARCHITECTURE.md) · [ROADMAP](SIGNAL-INTELLIGENCE-ROADMAP.md).

---

## Integration map

| Surface | Intended use | Later show | Avoid |
|---------|--------------|------------|--------|
| **SignalTerrain** | Primary application home | Receivers, incident timelines, calm digests mapped to Signal Cards; Overview four-panel | Fake live spectrum or threat heatmaps |
| **Dashboard (Studio)** | Environmental awareness glance | Short RF/space-weather or connectivity notes with provenance | SOC widgets / red severity walls |
| **Waypoint Scenes** | Radio propagation conditions (future) | Photography timing vs disturbed HF/VHF (educational) | Overlays pretending live SNR maps |
| **Outdoor Intelligence** | Weather / space-weather impacts on RF | Cross-link geomagnetic/solar context into SI observations | Duplicate space-weather engines |
| **Landscape Interpretation** | Terrain influences on propagation | Soft cross-links (ridge shadows, valleys) — never pseudo-raytracing | Claiming GIS path-prediction as fact |
| **Knowledge Platform** | Perspective + related research | `wk_*` on Signal Cards | Unlabeled AI opinion as fact |
| **Trust / Evidence Card** | Expand evidence & uncertainty | Shared confidence labels | Decorative % certainty |
| **Education** | Listening & cyber hygiene lessons | Sample observations + taxonomy vocabulary | Exploit labs |

Registry: `sharedEngines.signal-intelligence` (architecture Foundation V1).

---

## Shared contracts

1. Emit/consume `schema-v0.1` observations; prefer `schema-v1` Signal Cards for user-facing detail.  
2. Always keep **What / Why / Attention / Changed / Confidence / Trust** answerable.  
3. `insufficient` or rumor-quality evidence → Unavailable or speculative / preliminary label — do not promote.  
4. Elevated severity requires `attention.calmGuidance`.  
5. Adaptive attention may reorder digests; it must not auto-launch tools.  
6. Privacy: coarse location unless user opts into precision later.  
7. Waypoint Perspective must stay labeled and editorially owned.  
8. Do not add a parallel Cyber product to Studio primary nav.

---

## Relationship to other engines

| Engine | Relationship |
|--------|----------------|
| **Outdoor Intelligence** | Provides weather/light/space-weather context SI may reference |
| **Landscape Interpretation** | Optional terrain literacy for propagation teaching |
| **Mapping / Observation (WOS)** | Field places are distinct from SI signal observations |
| **Research Integrity** | Provenance badges / footnotes for digests |
| **Trust Framework** | Evidence Card + confidence vocabulary |
| **Knowledge Platform** | Related research + Perspective depth |
| **Worth Noticing** | Optional calm cues when context warrants — silence over filler |

---

## Suggested future API shape (not implemented)

```text
SIE.normalize(rawCitedOrUserLog) → Observation | SignalCard
SIE.attention.evaluate(observations[], prefs) → focusAreas[]
SIE.digest(observations[], { phaseFilters }) → ordered calm list
SIE.dashboard.compose(digest) → { changed, important, attention, stable }
```

No monitoring agents. No “connect to my SIEM.” No scanners.

---

## Honesty checklist

- [ ] Not advertised as Available until real source paths exist  
- [ ] Samples labeled Sample / Educational  
- [ ] Unknowns and alternatives (conflicts) visible  
- [ ] Verification status visible on Signal Cards  
- [ ] Legal listening notes on restricted RF topics  
- [ ] No placeholder cybersecurity dashboards presented as live  
- [ ] No exploit or attack content in engine packages  
- [ ] No parallel Cyber nav product
