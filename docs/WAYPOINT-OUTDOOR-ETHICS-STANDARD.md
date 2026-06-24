# Waypoint Outdoor Ethics Standard (WOES)

**Version 1.0.0** · Schema ID: `https://waypoint.studio/schemas/outdoor-ethics/v1`

Waypoint Studio is an environmental **education** platform first. The Outdoor Ethics Standard is company-wide guidance for how products, content, and features respect land, wildlife, people, and science.

Every **future feature** must be evaluated against these principles before shipping. The Constitution remains supreme law; this document operationalizes its privacy and citizen-science sections for the field.

*Related:* [Constitution](WAYPOINT-STUDIO-CONSTITUTION.md) · [Research Integrity](RESEARCH-INTEGRITY.md) · [Educational Framework](WAYPOINT-EDUCATIONAL-FRAMEWORK.md) · [Observation Standard](WAYPOINT-OBSERVATION-STANDARD.md)

---

## Purpose

Outdoor technology can encourage care or carelessness. WOES ensures Waypoint products:

- Send people outside with **humility and permission**
- Never gamify harvest, disturbance, or data extraction
- Default to **private, optional, informed** sharing
- Teach ethics alongside identification and timing

---

## The eight domains

| Domain | Key | Core obligation |
|--------|-----|-----------------|
| **Leave No Trace** | `leaveNoTrace` | Minimize impact on trails, soils, and communities |
| **Wildlife observation** | `wildlife` | Distance, season, stress, and sign without harassment |
| **Responsible foraging** | `foraging` | ID certainty, legal take, habitat, never share harvest spots |
| **Conservation** | `conservation` | Stewardship, recovery, honest status — not extraction |
| **Habitat protection** | `habitat` | Rare communities, wetlands, nesting, sensitive substrates |
| **Private property** | `privateProperty` | Permission, boundaries, no trespass facilitation |
| **Research ethics** | `research` | Cite sources, honest uncertainty, no fabricated data |
| **Citizen science** | `citizenScience` | Opt-in, disclosed fields, revocable, location fuzzing |

---

## Domain principles

### 1. Leave No Trace (`leaveNoTrace`)

Align with [Leave No Trace Center for Outdoor Ethics](https://lnt.org) — adapted for digital field tools:

| Principle | Waypoint application |
|-----------|---------------------|
| Plan ahead | Weather, access, regulations in OIP before suggesting field time |
| Travel on durable surfaces | Trail conditions in content; discourage shortcutting for “spots” |
| Dispose of waste | No littering prompts; pack-out in investigations |
| Leave what you find | Foraging copy: cut, don’t rake; no looting artifacts |
| Minimize campfire impacts | Seasonal fire-awareness where relevant |
| Respect wildlife | See wildlife domain |
| Be considerate | Quiet hours, other visitors, indigenous land acknowledgments where editorial |

**Reject features that:** reveal hidden routes to fragile sites, encourage trampling for photos, or celebrate “secret” patches.

---

### 2. Ethical wildlife observation (`wildlife`)

- Observe from distance; telephoto and binoculars over approach  
- Nesting and den seasons: extra distance; no playback harassment  
- Never bait wildlife for photos or sheds  
- Sign and scat are evidence — do not destroy  
- Sensitive species: no precise public coordinates (WOS `sensitiveSpecies`)  
- Empty-handed miles are success (Shed Hunting ethos)

**Reject features that:** leaderboard finds, exact den maps, or chase gamification.

---

### 3. Responsible foraging (`foraging`)

- **Positive ID** — multiple field marks; never eat uncertain fungi or plants  
- **Legal take** — permits, parks, private land; link to official sources when possible  
- **Sustainable harvest** — cut at soil line; leave small specimens; spread spores  
- **No spot sharing** — never publish exact harvest coordinates publicly  
- **Timing as education** — ForageCast is an index, not a harvest guarantee  
- **Poison look-alikes** — always named in species content

**Reject features that:** harvest scoreboards, public pin maps of mushrooms, or “best spots” social feeds.

---

### 4. Conservation (`conservation`)

- Recovery stories alongside threats  
- Name stewards and official projects when citing work  
- Do not imply Waypoint data drives enforcement without partnership  
- Support leave-no-trace volunteerism over performative activism  
- OIP `conservation` slice carries regional editorial stewardship notes

**Reject features that:** shame users, rank “eco scores,” or sell offset guilt.

---

### 5. Habitat protection (`habitat`)

- Wetlands, riparian zones, cliff nests, old growth: extra care copy  
- Stay on trail in fragile communities  
- No collecting in parks or protected areas in default guidance  
- Phenology education without encouraging specimen stripping  
- Ecoregion context from OIP `geography` informs habitat sensitivity

**Reject features that:** encourage off-trail bushwhacking to “complete” challenges.

---

### 6. Private property (`privateProperty`)

- Default assumption: **you need permission**  
- Maps show public context; do not plot private land boundaries as harvestable  
- No “nearest orchard” pins on private parcels  
- Location fuzzing for observations near homes (WOS + Constitution)  
- Trespass warnings in investigations and foraging content

**Reject features that:** scrape parcel data for foraging, or route users through closed land.

---

### 7. Research ethics (`research`)

- Distinguish editorial, prediction, and verified data ([Research Integrity](RESEARCH-INTEGRITY.md))  
- Cite institutional sources; mark placeholders honestly  
- No fabricated study summaries  
- Teach how observations become science — not funnel users unknowingly  
- WOS export requires license and consent

**Reject features that:** present models as peer-reviewed, or hide data sales.

---

### 8. Citizen science ethics (`citizenScience`)

From the Constitution — operationalized:

| Requirement | Implementation |
|-------------|----------------|
| Opt-in only | No pre-checked sharing; submission off until WOS service ships |
| Private by default | WOS `privacy.retention: local-only` default |
| Identity optional | WOS `observer.anonymous: true` default |
| Location respect | County / obfuscated / hidden precision |
| Informed consent | `consentRecordedAt`, `consentVersion` on share |
| Revocable | Export retract; delete path in future sync |
| No tricks | Clear “what / why / how used” before any upload UI |
| Sensitive species | Withhold export; educational warnings |

**Reject features that:** dark patterns, mandatory accounts to learn, or vague “help science” without naming use.

---

## Feature evaluation gate

Before shipping any feature, run `WDS.outdoorEthics.evaluateFeature(spec)` and resolve all **violations**.

### Constitutional alignment (required)

Does the feature help someone **observe, understand, create, share, learn, connect, or go outdoors** without violating privacy or ethics?

### Ethics checklist (required when domain applies)

| Question | Fail if |
|----------|---------|
| Does it increase physical harm risk without safety copy? | Yes → block |
| Does it encourage trespass or precise private-land targeting? | Yes → block |
| Does it gamify harvest, wildlife chase, or data volume? | Yes → block |
| Does it share location or identity without explicit opt-in? | Yes → block |
| Does it overstate scientific certainty? | Yes → block |
| Does it replace field verification with algorithmic authority? | Yes → warn / redesign |

### Spec shape

```javascript
WDS.outdoorEthics.evaluateFeature({
  name: "ForageCast heat map",
  description: "Educational terrain index for scouting habitat bands",
  domains: ["foraging", "habitat", "privateProperty"],
  collectsPersonalData: false,
  sharesLocationPublicly: false,
  gamification: false,
  requiresAccount: false,
  targetsSensitiveSpecies: false,
  facilitatesTrespass: false,
  presentsPredictionsAsFacts: false
});
```

Returns `{ pass, violations[], warnings[], applicableDomains[] }`.

---

## Outdoor Intelligence Platform integration

Every `WDS.outdoorIntelligence.get()` package includes an `ethics` slice:

```javascript
platform.ethics.version          // "1.0.0"
platform.ethics.domains          // per-domain reminders + links
platform.ethics.regional         // from conservation bundle when present
platform.ethics.citizenScience   // default disclosures
platform.ethics.featureTestUrl   // doc anchor for teams
```

Built by `WDS.outdoorEthics.fromOipPackage(platform)` during package finalization.

### When to surface in UI

- **Minimal clutter** — one quiet line where field action is suggested (investigations, foraging tools, citizen science blocks)  
- Use `WDS.outdoorEthics.renderReminder(domain)` or `renderFootnote(platform)`  
- Do not banner every dashboard card

---

## Content standards (editorial)

Authors use WOES alongside the [Educational Framework](WAYPOINT-EDUCATIONAL-FRAMEWORK.md) `observeSafely` pillar:

- WEF `ethics` and `safety` sections  
- FGDS citizen-science and investigation blocks  
- Species `conservationNote` in spotlights  
- ForageCast “do not disturb” investigation steps  

No mass rewrite of existing bundles — apply on **new** and **revised** content.

---

## Artifacts

| Artifact | Path |
|----------|------|
| This document | `docs/WAYPOINT-OUTDOOR-ETHICS-STANDARD.md` |
| JSON Schema | `design-system/ethics/schema-v1.json` |
| JS API | `design-system/js/ethics/wds-outdoor-ethics.js` |
| README | `design-system/ethics/README.md` |

---

## Authority chain

```
Constitution (privacy, citizen science, feature test)
    → Outdoor Ethics Standard (this document)
    → Research Integrity (provenance)
    → Educational Framework (observeSafely)
    → WOS (privacy, license, sensitive species)
    → OIP ethics slice (regional context)
```

---

## See also

- [Waypoint Method — Citizen Science](WAYPOINT-METHOD.md#citizen-science)
- [Constitution — Feature Test](WAYPOINT-STUDIO-CONSTITUTION.md#feature-test)
- [OIP schema](../design-system/outdoor-intelligence/schema-v2.json)

---

*Go outside. Take only pictures. Leave only footprints. Share only what you choose.*
