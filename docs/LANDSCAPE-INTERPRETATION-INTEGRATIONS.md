# Landscape Interpretation — Application Integrations

**Engine:** v0.1 architecture (no shipped UI)  
**Package:** `design-system/landscape-interpretation/`

Consumers should **query or embed** shared interpretation results later — they must not fork competing land-history vocabularies.

---

## Integration map

| Application | Intended use | What to show later | What not to do |
|-------------|--------------|--------------------|----------------|
| **Dashboard (Studio)** | Landscape summary · “What shaped this area?” | Short narrative + confidence + expand alternatives | Do not present as live local geology without layers |
| **Fieldry** | Observation context beside organism/habitat notes | Suggested field checks; link WOS tags → engine tags | Do not auto-overwrite user notes with interpretations |
| **ForageCast** | Habitat reasoning (succession, edges, wetlands) | Habitat-structure + succession stories as soft context | Do not treat stories as forage prediction inputs without review |
| **Sheds** | Habitat history for cover/edge literacy | Edge, succession, pasture-abandonment hypotheses | Do not fold into shed “probability” language |
| **Waypoint Scenes** | Photography suggestions for process-readable scenes | Seasonal prompts (leaf-off walls, foggy floodplains) | Do not overlay fake historic layers on photos |
| **Education / WEF** | Lessons on reading landscapes | Sample results + transparent IF/THEN | Do not omit alternatives in curriculum |

Registry already lists planned consumers under `sharedEngines.landscape-interpretation`.

---

## Shared contracts

1. Consume `schema-v0.1` interpretation objects — do not invent parallel fields.
2. Always surface **Observation / Interpretation / Confidence** distinctively when UI arrives.
3. Respect `confidenceCeiling` and `insufficient` → Unavailable.
4. Prefer linking `ruleIds` for “why this suggestion” expanders.
5. Keep engine packages loaded offline from `design-system/landscape-interpretation/`.

---

## Relationship to other engines

| Engine | Relationship |
|--------|----------------|
| **Species Knowledge (WSKB)** | Orthogonal — species ≠ land-process stories; may cross-link habitat terms carefully |
| **Mapping / Observation (WOS)** | Observations feed tags; interpretations never replace WOS records |
| **Outdoor Intelligence** | Weather/light context may season suggested field checks |
| **Photo Intelligence** | May use suggestions; does not author land history |
| **Biological model (Sheds)** | May *read* habitat-structure interpretations later; scoring stays separate |

---

## Suggested future API shape (not implemented)

```text
LIE.evaluate({ observations, place?, rulePackIds? }) → InterpretationResult
LIE.taxonomy.list(category?)
LIE.explainRule(ruleId) → plainLanguage if/then
```

No chat surface. Optional later: “assist drafting statement text” with `aiAssisted: true`.

---

## Honesty checklist for product owners

- [ ] Planned engines not advertised as Available
- [ ] Sample packs labeled Sample / Educational
- [ ] Alternatives visible before assertive headlines
- [ ] Mining / homestead / rare habitats carry ethics notes
- [ ] No commit of fabricated site histories for marketing
