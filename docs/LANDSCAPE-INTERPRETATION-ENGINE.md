# Landscape Interpretation Engine v0.1

**Status:** Architecture / schemas (no runtime evaluator, no UI, no maps)  
**Package:** `design-system/landscape-interpretation/`  
**Mission question:** *Why does this place look the way it does?*

This is **not** species identification, **not** GIS analysis, and **not** archival historical research. It is a reusable **reasoning layer** that turns environmental clues into understandable, hedged landscape stories for many Waypoint Studio apps.

---

## Purpose

Help people read landscapes with humility:

- Explain rather than classify.
- Teach observation.
- Encourage curiosity and build confidence without false certainty.
- Separate **observations** from **interpretations**.
- Work offline from static rule packs where possible.
- Allow future AI assistance without requiring AI.

---

## Scope (v0.1)

| In scope | Out of scope |
|----------|----------------|
| Result schema | User-facing screens |
| Interpretation taxonomy | Map layers / basemaps |
| Confidence model | Live DEM/soils/aerial fetch |
| Transparent if→then rule architecture | Species ID / ID models |
| Sample rule pack + sample result | AI chat assistant |
| Integration contracts for apps | Parcel/legal ownership claims |
| Provenance & ethics expectations | Survey-grade geology certificates |

---

## Design philosophy

1. **Stories with hinges** — every interpretation can swing open to alternatives.
2. **Looking is the product** — suggested field observations matter as much as labels.
3. **Confidence names support, not truth** — levels describe evidence strength.
4. **Regional honesty** — rules declare scope; Northeast walls ≠ worldwide fences.
5. **Educational first** — individuals, naturalists, educators, hobbyists; not enterprise EIA software.
6. **Align with Research Integrity** — provenance and hedging stay visible.

---

## Core model

```
Observations (what was noticed)
        │
        ▼
   Rule packs (transparent if → then)
        │
        ▼
Interpretations (provisional stories)
   ├── confidence + rationale
   ├── supporting evidence
   ├── alternative explanations
   └── suggested field observations
        │
        ▼
Optional narrative (min confidence ceiling)
```

Canonical JSON Schema:  
`design-system/landscape-interpretation/schema-v0.1.json`  
(`https://waypoint.studio/schemas/landscape-interpretation/v0.1`)

---

## Interpretation taxonomy

Five categories (see `taxonomy.json`):

| Category | Examples |
|----------|----------|
| Land Use History | Former pasture, historic orchard, stone wall boundary, logging history, … |
| Forest Development | Young / even-aged / mature forest, succession stages, canopy gaps, … |
| Water Processes | Floodplain, beaver influence, seep, terrace, riparian corridor, … |
| Geological Processes | Glacial deposits, moraine, esker, kettle, talus, ancient shoreline, … |
| Habitat Structure | Edge, interior, shrubland, meadow succession, mixed forest, … |

Terms are vocabulary for stories, **not** automated class labels to display as certified fact.

---

## Confidence framework

Levels: `high` · `moderate` · `low` · `speculative` · `insufficient`

Defined in `confidence.json`. Consumer rules:

- Never present uncertain interpretations as facts.
- Prefer level labels over numeric scores in UI.
- `insufficient` → Unavailable / keep looking — do not invent a story.
- Narrative `confidenceCeiling` must not exceed the weakest cited interpretation.

Every interpretation **must** include: supporting evidence, alternatives (≥1), suggested field observations (≥1), and a confidence rationale.

---

## Rule architecture

Modular rule packs (`rules/schema-v0.1.json`) with:

- Readable **IF** / **THEN** plain-language fields
- Structured predicates (`tag`, `tagAny`, `tagAll`, …)
- `confidenceCeiling`
- Alternatives + field checks + limitations
- Regional scope on the pack
- Optional ethics notes

Sample pack: `rules/samples/northeast-land-use.sample.json`  
Examples include agricultural-abandonment and stone-wall-boundary rules matching the brief’s “may have regenerated…” / “stone walls likely indicate…” statements.

Rules are transparent enough to show users later (“because wall + wire remnant…”). Evaluators can arrive later without re-authoring the vocabulary.

---

## Future data sources (not implemented)

Documented only — no wiring in v0.1:

DEM / slope / aspect · LiDAR · historical aerials · historic topos · USGS geology · USDA soils · NLCD · forest inventory · watersheds · hydrography · climate normals · fire history · logging records · OSM · user observations (WOS)

Any remote layer must carry provenance and may raise—but not silently invent—confidence.

---

## Limitations

- Sample rules are educational heuristics, not peer-reviewed regional models.
- No geometry engine; place is optional context.
- Without historic imagery, most land-use stories should stay ≤ `moderate`.
- Old-growth and mining terms are indicator language only — never legal designations.
- Karst and some geologic terms are reserved for regional packs.

---

## Ethical considerations

- Do not encourage artifact collecting, wall dismantling, or unsafe mine exploration.
- Avoid revealing sensitive archaeological or rare-species micro-locations in public narratives.
- Private by default: user observations stay on-device unless opted in.
- Do not assert ownership, trespass rights, or land claims.
- Label AI-assisted prose (`meta.aiAssisted`).
- Cultural landscapes deserve care — “abandoned homestead” is a reading, not a demolition permit.

---

## Data provenance expectations

| Source kind | Expectation |
|-------------|-------------|
| `user-field` / WOS | User-controlled; confidence from observer |
| Historic aerial / map hints | Cite agency + year when wired |
| DEM / soils / geology | Cite layer + access date; mark Estimated |
| `educational-example` | Samples and lessons only |
| AI paraphrase | Allowed later only with `aiAssisted: true` and cited evidence |

Align with [RESEARCH-INTEGRITY.md](RESEARCH-INTEGRITY.md).

---

## Roadmap (documentation intent)

| Phase | Goal |
|-------|------|
| **v0.1** | Schemas, taxonomy, confidence, sample rules (**this**) |
| v0.2 | Offline evaluator stub matching sample tags → results (still no product UI) |
| v0.3 | Fieldry observation-tag bridge |
| v0.4 | Optional historic aerial / soils adapters with honesty labels |
| v1.0 | First thin consumers (Dashboard summary, Fieldry context) with full alternatives UI |

---

## Integrations

See [LANDSCAPE-INTERPRETATION-INTEGRATIONS.md](LANDSCAPE-INTERPRETATION-INTEGRATIONS.md).

---

## See also

- [PLATFORM-ENGINES.md](PLATFORM-ENGINES.md)
- [PLATFORM-ARCHITECTURE.md](PLATFORM-ARCHITECTURE.md)
- [WAYPOINT-OBSERVATION-STANDARD.md](WAYPOINT-OBSERVATION-STANDARD.md)
- Package README: `design-system/landscape-interpretation/README.md`
