# Waypoint Education Framework (WEF)

The shared **education engine** for every Waypoint Studio product. Every app includes a **Learn** section powered by the same lesson template, renderer, and domain taxonomy.

**North star:** Teach like a patient field guide — clear structure, ethical practice, safety first, challenge in the real world.

## Requirements

Every product MUST:

1. Include a **Learn** tab or section in navigation
2. Ship curriculum as JSON/JS using the canonical lesson template
3. Load `wds-education.js` + `wds-education.css` (via `wds.css`)
4. Tag lessons with at least one [domain](./DOMAINS.md)

## Quick start

```html
<div id="learn-curriculum" aria-label="Learn"></div>

<script src="design-system/js/wds-core.js"></script>
<script src="design-system/js/wds-education.js"></script>
<script src="content/my-product-curriculum.js"></script>
<script>
  WDS.education.renderCurriculum(
    document.getElementById("learn-curriculum"),
    MyProductCurriculum,
    { legacy: false }
  );
</script>
```

### Legacy adapter (Waypoint Scenes)

Existing content using `steps`, `fieldExercise`, `reflection`, and `challenge` is converted at render time:

```js
WDS.education.renderCurriculum(mount, WaypointLearnContent, { legacy: true });
```

## Canonical lesson template

Every lesson uses **the same eleven sections** in **fixed order**:

| Key | Label | Purpose |
|-----|-------|---------|
| `what` | What is it? | Definition, concept, or subject introduction |
| `why` | Why it matters | Stakes, context, connection to the user |
| `identify` | How to identify it | Field marks, sensory cues, diagnostics |
| `howItWorks` | How it works | Mechanism, process, technique (numbered steps) |
| `fieldObservations` | Field observations | Prompts for noticing in the real world |
| `mistakes` | Common mistakes | Pitfalls beginners hit |
| `ethics` | Ethics | Responsible, respectful practice |
| `safety` | Safety | Hazards, boundaries, when to stop |
| `related` | Related lessons | Cross-links within curriculum |
| `challenge` | Challenge | Concrete task to try |
| `quiz` | Quiz | Knowledge check (**future** — stub renders today) |

See [SECTIONS.md](./SECTIONS.md) for content shapes and when to skip a section.

## Authoring a lesson

```js
WDS.education.factory.createLesson("morel-basics", "Reading a morel patch", {
  domains: ["species", "ecology", "foragecast"],
  level: "beginner",
  durationMinutes: 12,
  sections: {
    what: { body: "…" },
    why: { body: "…" },
    identify: { bullets: ["…", "…"] },
    howItWorks: { steps: ["…", "…"] },
    fieldObservations: { prompts: ["…"] },
    mistakes: { bullets: ["…"] },
    ethics: { body: "…" },
    safety: { body: "…" },
    challenge: { body: "…" },
    quiz: { status: "future", items: [] }
  },
  related: [{ id: "habitat-oak", title: "Oak woodland floor" }]
});
```

Full empty scaffold: [curriculum.example.json](./curriculum.example.json)

## Curriculum shape

```js
{
  version: "1.0.0",
  product: "steepleaf",
  mission: "…",
  intro: "…",
  tracks: [
    {
      id: "foundations",
      title: "Foundations",
      subtitle: "…",
      domains: ["species"],
      lessons: [ /* Lesson[] */ ]
    }
  ]
}
```

## API (`WDS.education`)

| Method | Description |
|--------|-------------|
| `renderCurriculum(mount, curriculum, options)` | Render full UI into a DOM node |
| `renderLesson(lesson, options)` | HTML string for one lesson |
| `normalizeLesson(lesson)` | Canonical shape + defaults |
| `validateLesson(lesson)` | Schema-ish validation |
| `validateCurriculum(curriculum)` | Validate all tracks |
| `fromLegacyCurriculum(legacy)` | Migrate old Scenes format |
| `findLesson(id, curriculum)` | Lookup by lesson id |
| `filterByDomain(curriculum, domain)` | Filter lessons |
| `factory.createLesson(...)` | Blank lesson scaffold |

Options for `renderCurriculum`:

- `legacy: true` — adapt `steps` / `fieldExercise` / `reflection` / `challenge`
- `hideIntro: true` — product provides its own intro panel
- `showSkipped: true` — render N/A sections visibly
- `strict: true` — log validation errors to console

## Domains

Lessons tag one or more domains: species, habitats, ecology, weather, geology, astronomy, tea, wine, wildlife, navigation, photography, conservation, field-skills.

See [DOMAINS.md](./DOMAINS.md) for product mapping.

## Files

| File | Role |
|------|------|
| `js/wds-education.js` | Engine: normalize, validate, render |
| `js/wds-education-factory.js` | Authoring helpers |
| `css/wds-education.css` | Section visual language |
| `schema.json` | JSON Schema for curriculum files |
| `curriculum.example.json` | Structural example only |

## Product integration

| Product | Learn label (suggested) | Primary domains |
|---------|-------------------------|-----------------|
| Waypoint Scenes | Field Guide | photography, field-skills, weather |
| ForageCast | Learn | species, ecology, weather, conservation |
| Shed Hunting | Learn | wildlife, geology, field-skills |
| Fieldry | Learn | field-skills, navigation, tea |
| Steepleaf | Learn | species, habitats, ecology, tea |
| Savant Sommelier | Learn | wine, ecology, conservation |
| SignalTerrain | Learn | navigation, geology, astronomy, weather |
| Terrainbound | Learn | navigation, conservation, wildlife |

## Quiz (future)

When ready, set `quiz.status: "ready"` and provide items:

```js
quiz: {
  status: "ready",
  items: [
    {
      question: "Which direction does moss prefer on a trunk?",
      choices: ["North side", "South side", "Either equally"],
      answer: 0,
      explanation: "In the northern hemisphere, north faces stay damper."
    }
  ]
}
```

Interactive grading is not wired yet; markup and styles are reserved.

## Validation

```js
var result = WDS.education.validateCurriculum(myCurriculum);
if (!result.ok) console.warn(result.errors);
```

## Related

- [Design system](../README.md)
- [WDS patterns](../docs/PATTERNS.md)
- [Lesson sections reference](./SECTIONS.md)
