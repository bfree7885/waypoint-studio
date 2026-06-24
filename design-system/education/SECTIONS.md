# WEF Lesson Sections

Fixed template order. The renderer outputs only sections with content unless `showSkipped: true`.

**Company standard:** Every lesson should also satisfy the [nine educational pillars](../../docs/WAYPOINT-EDUCATIONAL-FRAMEWORK.md). See [TOPIC-STANDARD.md](./TOPIC-STANDARD.md) for pillar ↔ WEF mapping. Audit with `WDS.educationTopic.auditWefLesson(lesson)`.

## Section content shape

Each section (except `related` and `quiz`) accepts a **SectionContent** object:

```js
{
  title: "Optional override label",
  body: "Prose paragraph",
  steps: ["Numbered step one", "Step two"],
  bullets: ["Unordered point"],
  prompts: ["Field prompt one", "Reflection prompt two"],
  skipped: false,
  skipReason: "Shown when skipped: true"
}
```

Shorthand: a plain string becomes `{ body: "…" }`; an array becomes `{ bullets: […] }`.

## Section reference

### What is it? (`what`)

**Purpose:** Name the subject. Orient the learner in one calm breath.

**Use:** Definition, species intro, concept boundary ("Parallax is not weather").

**Format:** `body` or short `bullets`.

---

### Why it matters (`why`)

**Purpose:** Motivation without hype. Connect knowledge to field experience or stewardship.

**Format:** `body` or `bullets`.

---

### How to identify it (`identify`)

**Purpose:** Sensory, diagnostic, or field-mark criteria.

**Use heavily for:** species, habitats, geology, wine, tea, wildlife.

**Skip when:** abstract topics (e.g. export workflow) — set `skipped: true`.

**Format:** `bullets` preferred; `steps` for sequential ID flow.

---

### How it works (`howItWorks`)

**Purpose:** Mechanism, technique, or process.

**Format:** `steps` (rendered numbered); `body` for short explanations.

---

### Field observations (`fieldObservations`)

**Purpose:** What to notice outdoors or at the desk. Replaces ad-hoc "field exercise" + "reflection" blocks.

**Format:**

- Single prompt: `body` or one-item `prompts`
- Exercise + reflection: `prompts: ["In the field…", "Reflection…"]`

---

### Common mistakes (`mistakes`)

**Purpose:** Prevent harm, embarrassment, or misidentification.

**Format:** `bullets`.

---

### Ethics (`ethics`)

**Purpose:** Leave no trace, permission, cultural respect, honest representation.

**Required for:** foraging, wildlife, species, conservation, wine/tea sourcing.

**Skip when:** pure in-app technique with no field impact.

---

### Safety (`safety`)

**Purpose:** Physical risk, toxicity, weather exposure, legal boundaries.

**Required for:** species (especially fungi), wildlife, geology, navigation, weather.

**Format:** `body` or `bullets`. Never bury critical warnings only in `mistakes`.

---

### Related lessons (`related`)

**Purpose:** Curriculum navigation.

**Format:** Array on lesson root (not inside `sections`):

```js
related: [
  { id: "lesson-id", title: "Display title" },
  "other-lesson-id"
]
```

---

### Challenge (`challenge`)

**Purpose:** One concrete assignment — field, studio, or tasting.

**Format:** `body` (single task) or `steps` (multi-part).

---

### Quiz (`quiz`) — future

**Purpose:** Spaced recall after field practice.

**Today:** `status: "future"` renders a quiet placeholder.

**Future:**

```js
quiz: {
  status: "ready",
  items: [
    {
      question: "…",
      choices: ["A", "B", "C"],
      answer: 0,
      explanation: "…"
    }
  ]
}
```

## Visual language (CSS)

| Section | Class | Treatment |
|---------|-------|-----------|
| What | `wef-section--what` | Neutral inset |
| Why | `wef-section--why` | Warm hearth accent |
| Identify | `wef-section--identify` | Sage accent |
| How it works | `wef-section--how` | Open layout, numbered steps |
| Field observations | `wef-section--field` | Sage border (same as identify) |
| Mistakes | `wef-section--mistakes` | Muted amber |
| Ethics | `wef-section--ethics` | Warm border |
| Safety | `wef-section--safety` | Subtle danger tone |
| Challenge | `wef-section--challenge` | Hearth border |
| Related | `wef-section--related` | Pill links |
| Quiz | `wef-section--quiz` | Dashed future / choice buttons |

## Label overrides

Per-lesson section titles (e.g. "How to taste it" instead of "How to identify it"):

```js
identify: {
  title: "How to recognize it in the glass",
  bullets: ["…"]
}
```

Or product-wide via `WDS.education.getSectionLabels({ identify: "How to spot it" })` for custom renderers.
