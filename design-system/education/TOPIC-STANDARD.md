# Waypoint Educational Framework (WEF Topic Standard)

**Nine pillars · every educational topic**

This document is the **authoring standard** for new educational content. It does not require rewriting published lessons, field guides, or bundles — use the mapping tables to audit and extend existing work over time.

*Supreme law:* [`WAYPOINT-STUDIO-CONSTITUTION.md`](../../docs/WAYPOINT-STUDIO-CONSTITUTION.md)  
*Philosophy:* [`WAYPOINT-METHOD.md`](../../docs/WAYPOINT-METHOD.md)  
*Company framework:* [`WAYPOINT-EDUCATIONAL-FRAMEWORK.md`](../../docs/WAYPOINT-EDUCATIONAL-FRAMEWORK.md)  
*Lesson engine:* [`README.md`](./README.md) · [`SECTIONS.md`](./SECTIONS.md)

---

## The nine pillars

Every educational topic — species, habitat, weather phenomenon, skill, research brief, or challenge — should eventually answer:

| # | Pillar | Key | Learner question |
|---|--------|-----|------------------|
| 1 | **What is it?** | `what` | Name and orient — what am I learning about? |
| 2 | **Why does it matter?** | `why` | Stakes, stewardship, personal relevance |
| 3 | **How does it work?** | `howItWorks` | Mechanism, process, technique |
| 4 | **Where can it be found?** | `where` | Range, habitat, place, map |
| 5 | **When is it most relevant?** | `when` | Season, phenology, timing, calendar |
| 6 | **How can someone safely observe it?** | `observeSafely` | Safety, ethics, field prompts |
| 7 | **How can they learn more?** | `learnMore` | Lessons, articles, tools, videos |
| 8 | **How does this connect to larger ecological systems?** | `connections` | Web of geology, weather, life, water, humans |

Pillar 9 in product copy is sometimes listed as “learn more” split from connections — **connections** is always required for ecological literacy; **learnMore** is navigation.

---

## Content shape (`Topic`)

```json
{
  "id": "topic-yellow-morel",
  "title": "Yellow morel",
  "type": "species",
  "product": "foragecast",
  "domains": ["species", "ecology"],
  "level": "beginner",
  "pillars": {
    "what": { "body": "…" },
    "why": { "body": "…" },
    "howItWorks": { "steps": ["…"] },
    "where": { "body": "…", "habitats": ["…"], "mapRef": null },
    "when": { "season": "late April – late May", "body": "…" },
    "observeSafely": {
      "safety": { "bullets": ["…"] },
      "ethics": { "body": "…" },
      "prompts": ["…"]
    },
    "learnMore": {
      "lessons": [{ "id": "morel-basics", "title": "…" }],
      "articles": [],
      "tools": [{ "href": "…", "label": "Season table" }]
    },
    "connections": {
      "body": "…",
      "spheres": ["weather", "soils", "fungi"]
    }
  }
}
```

Full schema: [`topic-schema.json`](./topic-schema.json)  
Empty scaffold: [`templates/topic-scaffold.json`](./templates/topic-scaffold.json)

---

## Pillar content shapes

Each pillar accepts **SectionContent** (same as WEF lessons):

```js
{ title?, body?, steps?, bullets?, prompts?, skipped?, skipReason? }
```

| Pillar | Preferred format | Notes |
|--------|------------------|-------|
| `what` | `body` or short `bullets` | Phenomenon before jargon |
| `why` | `body` | No hype; honest stakes |
| `howItWorks` | `steps` | Numbered process |
| `where` | `body` + optional `habitats[]`, `mapRef` | Tie to OIP region when relevant |
| `when` | `season` string + `body` | Phenology, time of day, weather windows |
| `observeSafely` | `safety`, `ethics`, `prompts` sub-objects | **Required** for field topics |
| `learnMore` | `lessons[]`, `articles[]`, `tools[]` | Links only — no orphan CTAs |
| `connections` | `body` + optional `spheres[]` | At least two spheres when possible |

---

## Mapping: nine pillars → WEF lesson sections

Existing WEF lessons (`design-system/education/`) map without migration:

| Pillar | WEF section(s) |
|--------|----------------|
| What is it? | `what` |
| Why does it matter? | `why` |
| How does it work? | `howItWorks` |
| Where can it be found? | `identify` (place cues) + author adds `where` in new topics |
| When is it most relevant? | `fieldObservations` (timing prompts) + `when` in new topics |
| Safely observe | `safety` + `ethics` + `fieldObservations` |
| Learn more | `related` + `challenge` (entry point) |
| Ecological connections | Author adds `connections` or expands `why` + `fieldObservations` |

Audit helper:

```js
WDS.educationTopic.auditWefLesson(lesson);
// { covered: [...], gaps: [...], score: 0.75 }
```

---

## Mapping: nine pillars → Field Guide (FGDS)

| Pillar | FGDS section |
|--------|----------------|
| What is it? | Identification (`identification`) + title |
| Why does it matter? | `why` |
| How does it work? | `diagrams` |
| Where can it be found? | `maps` + quick facts range |
| When is it most relevant? | Quick facts season |
| Safely observe | `investigation` + `citizen-science` + ethics in investigation |
| Learn more | `related` |
| Connections | `connect` |

See [`FIELD-GUIDE-STANDARDS.md`](../../docs/FIELD-GUIDE-STANDARDS.md).

---

## Mapping: nine pillars → Content Engine types

| Content type | Primary pillars (emphasis) |
|--------------|---------------------------|
| Species spotlight | what, where, when, observeSafely, connections |
| Regional field note | when, where, observeSafely |
| Research brief | why, howItWorks, connections, learnMore |
| Weekend investigation | observeSafely, when, where |
| Outdoor challenge | when, observeSafely, connections |
| Featured video | what, howItWorks, learnMore |

---

## When to skip a pillar

Skip only with explicit `skipped: true` and `skipReason` in editorial workflow.

| Pillar | May skip when |
|--------|----------------|
| `where` | Pure in-app technique (export workflow) |
| `when` | Timeless concept (compass basics) |
| `connections` | Never skip for ecological topics; may shorten for pure tool docs |
| `observeSafely` | Never skip for species, foraging, wildlife, weather field work |

---

## Voice and integrity

- Open with **observation or question**, not definition ([Waypoint Method](../../docs/WAYPOINT-METHOD.md)).
- Use [`WDS.researchIntegrity`](../../docs/RESEARCH-INTEGRITY.md) for provenance on predictions vs observations.
- Citizen science lines use “optional, coming soon” until WOS submission ships.
- Tentative language for phenology and forecasts (“may,” “watch for,” “confirm outdoors”).

---

## Templates for authors

| Template | Path | Use |
|----------|------|-----|
| JSON scaffold | [`templates/topic-scaffold.json`](./templates/topic-scaffold.json) | Machine authoring, CMS |
| Species topic | [`templates/species-topic.md`](./templates/species-topic.md) | Writer brief |
| Article / phenomenon | [`templates/article-topic.md`](./templates/article-topic.md) | Writer brief |
| Field investigation | [`templates/investigation-topic.md`](./templates/investigation-topic.md) | Outdoor lab |

---

## JavaScript API

Load `wds-education-topic.js` (included in `wds.js`):

```js
WDS.educationTopic.PILLARS           // ordered pillar definitions
WDS.educationTopic.createTopic(opts) // empty Topic
WDS.educationTopic.validateTopic(t)  // { ok, errors, gaps }
WDS.educationTopic.auditWefLesson(lesson)
WDS.educationTopic.topicFromWefLesson(lesson)  // bridge, non-destructive
WDS.educationTopic.renderOutline(topic, opts)  // editorial QA HTML
```

---

## Authority chain

```
Constitution → Waypoint Method → Educational Framework (9 pillars)
    → WEF lessons / FGDS pages / Content Engine types
    → Research Integrity (trust signals)
```

---

*Observe. Understand. Create. Share.*
