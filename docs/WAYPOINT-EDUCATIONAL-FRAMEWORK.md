# Waypoint Educational Framework

**Environmental education first — consistent across every page and every app**

Waypoint Studio is an environmental education platform. The Educational Framework is the **company-wide content standard**: every topic, lesson, species page, article, video companion, and field investigation should help a learner answer the same nine questions.

This document is a core architectural artifact alongside the [Constitution](WAYPOINT-STUDIO-CONSTITUTION.md), [Waypoint Method](WAYPOINT-METHOD.md), and [Research Integrity](RESEARCH-INTEGRITY.md) framework.

*Do not rewrite existing content to adopt this overnight.* Use the templates and audit tools for **new** work; map legacy content over time.

---

## Mission

Most nature media delivers facts. Waypoint delivers **field literacy**: the habit of looking, asking, testing, and returning — with honest uncertainty and ecological context.

**Observe. Understand. Create. Share.**

The nine pillars below are how we **Understand** and **Connect** in every product.

---

## The nine pillars

| # | Question | Pillar key | What good looks like |
|---|----------|------------|----------------------|
| 1 | **What is it?** | `what` | Clear name and boundary — what is in scope, what is not |
| 2 | **Why does it matter?** | `why` | Motivation without hype; stewardship and curiosity |
| 3 | **How does it work?** | `howItWorks` | Mechanism, process, or technique in plain language |
| 4 | **Where can it be found?** | `where` | Place, range, habitat, map — regional when possible |
| 5 | **When is it most relevant?** | `when` | Season, phenology, time of day, weather windows |
| 6 | **How can someone safely observe it?** | `observeSafely` | Safety, ethics, field prompts, common mistakes |
| 7 | **How can they learn more?** | `learnMore` | Lessons, articles, tools, videos — honest next steps |
| 8 | **How does this connect to larger ecological systems?** | `connections` | Web of geology, weather, life, water, soils, humans |

Every pillar may be **skipped** only with an explicit editorial reason (see [TOPIC-STANDARD.md](../design-system/education/TOPIC-STANDARD.md)).

---

## How this fits the stack

```
┌─────────────────────────────────────────────────────────────┐
│  Constitution — mission, privacy, feature test                │
├─────────────────────────────────────────────────────────────┤
│  Waypoint Method — learning cycle, outdoor-first philosophy │
├─────────────────────────────────────────────────────────────┤
│  Educational Framework (this document) — 9 pillars          │
├──────────────┬────────────────────┬─────────────────────────┤
│  WEF lessons │  Field Guide (FGDS)  │  Content Engine types   │
│  Learn tabs  │  Species, habitat,   │  Spotlight, field notes,│
│              │  briefs, challenges  │  research, investigations│
├──────────────┴────────────────────┴─────────────────────────┤
│  Research Integrity — provenance, confidence, citations     │
├─────────────────────────────────────────────────────────────┤
│  Outdoor Intelligence Platform — regional context (where/when)│
├─────────────────────────────────────────────────────────────┤
│  WOS (future) — user observations as evidence               │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Role in education |
|-------|-------------------|
| **Waypoint Method** | *How* we teach — observe before explain, always return outdoors |
| **Educational Framework** | *What* every topic must answer — nine pillars |
| **WEF** (`design-system/education/`) | Canonical **lesson** template and renderer |
| **FGDS** (`FIELD-GUIDE-STANDARDS.md`) | Canonical **page layout** for long-form guides |
| **Content Engine** | Regional **editorial** publishing — spotlights, notes, briefs |
| **Research Integrity** | Trust labels — editorial vs prediction vs observation |

---

## Content types covered

The nine pillars apply to all educational surfaces:

| Surface | Primary delivery | Pillar emphasis |
|---------|------------------|-----------------|
| WEF Learn lesson | `WDS.education` | All eight — via section mapping |
| Species / habitat guide | FGDS templates | where, when, observeSafely |
| Species spotlight | Content bundle | what, when, connections |
| Regional field note | Content bundle | when, where, observeSafely |
| Research brief | Content bundle | why, howItWorks, connections |
| Weekend investigation | Content bundle | observeSafely, when, where |
| ForageCast season table | Tool + copy | howItWorks, when, learnMore |
| Video companion | FGDS / article | what, learnMore |
| Outdoor challenge | Method template | when, observeSafely |
| Future WOS observation | WOS + integrity | observeSafely, learnMore |

---

## Implementation artifacts

| Artifact | Path |
|----------|------|
| Authoring standard | [`design-system/education/TOPIC-STANDARD.md`](../design-system/education/TOPIC-STANDARD.md) |
| JSON Schema | [`design-system/education/topic-schema.json`](../design-system/education/topic-schema.json) |
| Empty topic | [`design-system/education/templates/topic-scaffold.json`](../design-system/education/templates/topic-scaffold.json) |
| Writer templates | [`design-system/education/templates/`](../design-system/education/templates/) |
| Topic JS API | [`design-system/js/wds-education-topic.js`](../design-system/js/wds-education-topic.js) |
| WEF lessons | [`design-system/education/README.md`](../design-system/education/README.md) |
| Field guides | [`FIELD-GUIDE-STANDARDS.md`](FIELD-GUIDE-STANDARDS.md) |

---

## JavaScript API

```javascript
// Empty topic for authoring
var topic = WDS.educationTopic.createTopic({
  id: "valley-fog",
  title: "Valley fog",
  type: "phenomenon",
  product: "signalterrain"
});

// Validate before publish
var result = WDS.educationTopic.validateTopic(topic);
// { ok: false, errors: [...], gaps: ["where", "connections"] }

// Audit existing WEF lesson without rewriting
var audit = WDS.educationTopic.auditWefLesson(lesson);

// Bridge WEF → Topic (non-destructive)
var topic = WDS.educationTopic.topicFromWefLesson(lesson);

// Editorial QA outline (optional HTML)
mount.innerHTML = WDS.educationTopic.renderOutline(topic, { showGaps: true });
```

Loaded via `wds.js` after `wds-education.js`.

---

## Editorial workflow

1. **Choose type** — species, phenomenon, skill, research, etc.
2. **Copy scaffold** — `topic-scaffold.json` or writer markdown template
3. **Fill nine pillars** — skip only with `skipReason`
4. **Run validate** — `WDS.educationTopic.validateTopic`
5. **Map to surface** — WEF lesson, FGDS page, or content bundle field
6. **Add integrity** — provenance badge for editorial vs prediction
7. **Outdoor test** — Method rule: if the learner stays indoors, the topic failed

---

## Relationship to Waypoint Method UX questions

The Method lists six visitor questions ([WAYPOINT-METHOD.md § User Experience](WAYPOINT-METHOD.md#user-experience)). The nine pillars **extend** those for authors:

| Method UX question | Pillar(s) |
|--------------------|-----------|
| What am I looking at? | `what` |
| Why does it happen? | `why`, `howItWorks` |
| How is it connected? | `connections` |
| What can I investigate today? | `learnMore.challenge`, `observeSafely` |
| What tool can help? | `learnMore.tools` |
| What should I observe outside? | `observeSafely`, `when`, `where` |

---

## Product responsibility

Every product **Learn** section uses WEF. Every long-form guide uses FGDS. Every regional editorial piece should trend toward nine-pillar coverage in future revisions.

| Product | Education home |
|---------|----------------|
| Waypoint Studio | Meta-labs, cross-product challenges |
| ForageCast | Species, ecology, timing |
| Steepleaf | Botany, habitats |
| Fieldry | Field skills, journaling |
| Shed Hunting | Wildlife sign, ethics |
| SignalTerrain | Maps, weather, geology |
| Terrainbound | Routes, conditions, conservation |
| Savant Sommelier | Terroir as ecology |
| Waypoint Scenes | Photography as evidence |

---

## What we do not do

- Gamification, streaks, or leaderboards for learning  
- Definition-first lessons with no outdoor assignment  
- Phenology or harvest claims without integrity labels  
- Mandatory accounts to read educational content  
- Rewriting all legacy copy in one pass  

---

## See also

- [Waypoint Method](WAYPOINT-METHOD.md)
- [Field Guide Standards](FIELD-GUIDE-STANDARDS.md)
- [Content Engine](WAYPOINT-CONTENT-ENGINE.md)
- [Research Integrity](RESEARCH-INTEGRITY.md)
- [Waypoint Observation Standard](WAYPOINT-OBSERVATION-STANDARD.md)

---

*The Educational Framework: nine questions, one field laboratory, every product.*
