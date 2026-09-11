# Summit Tutor Architecture

Design authority for TerrainBound’s Earth Science tutor. Cedar Hollow is the vertical slice. This document does not implement High Country, Dark Sky Basin, or a paid AI API.

## Product purpose

TerrainBound should be independently usable as an Earth Science learning environment because a student can ask for help that knows the current field work. Summit is that help. It teaches. It does not grant Field Clearance. It does not complete puzzles.

## Wren vs Summit

| | Wren | Summit |
| --- | --- | --- |
| Role | Field mentor / expedition leader | Earth Science tutor |
| Judges the case | Yes | No |
| Grants clearance | Yes | No |
| After Action Report | Wren runs it | Summit may explain why a pin did not hold |
| Teaches concepts | Light field framing | Progressive tutoring ladder |
| HUD next-action strip | Field guidance (`guidance.js`) stays Wren/interface | Not renamed Summit |

Do not combine them. Do not rename `fieldGuidance` to Summit.

## Pipeline

```
GAME STATE
    ↓
SUMMIT CONTEXT BUILDER   (js/summit-context.js)
    ↓
CURRICULUM / TUTOR POLICY (data/summit/*, js/summit-policy.js)
    ↓
RESPONSE PROVIDER         (DeterministicProvider now; AIProvider later)
    ↓
SUMMIT UI                 (sheet/drawer, not the world)
```

Game state, evidence, measurements, clearance, and competencies remain deterministic TerrainBound systems. A provider only writes tutoring language.

## Context builder

`buildSummitContext` exposes structured facts when available:

- region, location, nearby named places
- active puzzle and stage (play order, not topic numbers)
- competencies
- observations, finds, measurements, predictions
- evidence earned and missing
- Field Tablet cards (summaries today; raw flume trials when present)
- graph axes / interpretation flag
- rejected explanations / last land hint
- revisions
- current Wren claim, pinned notes, `judgeClaim` result
- Summit memory (level, concepts, misconceptions, struggle)

The builder does not infer these from chat prose. If a measurement is absent, the field is empty. Providers must not invent it.

## Tutor policy / hint ladder

| Level | Name | Job |
| --- | --- | --- |
| 0 | Orient | Remind what the student is trying to determine |
| 1 | Notice | Point attention at the land, table, or tablet |
| 2 | Compare / reason | Ask for a comparison the student can still make |
| 3 | Teach | Explain the concept |
| 4 | Direct scaffold | Make the relationship explicit; the student still performs the action |

Hints climb the ladder. “Explain this” may jump to teaching. There is no hint cap, no score penalty, and no shame copy.

## Misconception architecture

Puzzle packs carry named misconception lines (observation vs interpretation, unfair test, trees-as-cause, overclaim, timescale, and others). AAR `judgeClaim` kinds (`overclaim`, `misconception`, `incomplete`) feed CH-09 tutoring. “Try looking again” is not an acceptable universal reply.

## Field Tablet integration

If a note exists, Summit may name its title and category and, when present, read actual runoff times. If it does not exist, Summit says the student has not collected it and points at the investigation that can produce it. Summit never fabricates times, views, or pins.

Today’s tablet cards are puzzle summaries. Context already has a `raw` slot for measurements, graph fields, and later maps/images/tables. Do not pretend summaries are raw data.

## Concept library

`data/summit/concepts.json` holds reusable terms (observation, interpretation, evidence, variable, fair test, runoff, slope, gravity, pattern, system, storage, downstream, timescale, revision, cause, correlation). Puzzle packs reference them. Later regions add terms; they should not bury definitions in `game.js`.

## Deterministic provider

`createDeterministicProvider` is the offline engine: intent recognition, authored puzzle lines, misconception lines, vocabulary, evidence-aware AAR help. It is not an LLM. Do not call the scripted menu an AI tutor.

## Future AI provider boundary

```
createSummitEngine({ provider })
```

A later `AIProvider` may generate conversational wording from the same request `{ context, intent, level, question }`. It may not become the authority for game state, evidence, measurements, correct puzzle completion, clearance, competency, or unlocks. If context says a note is missing, the model may not claim it exists. API keys never belong in browser code. This phase does not add a paid API.

## Grounding / hallucination contract

- Structured context is the source of truth.
- Forbidden in tutoring text: `CH-01` style ids, “pin CH-…”, quiz stems, Correct/Incorrect.
- Even at level 4, the student pins, taps, or walks.
- Adaptive “Summit has an idea” is optional and quiet. Summit never auto-opens.

## Save state

Summit memory is a v6 save field (`summit`): hint level per puzzle, concepts explained, misconceptions addressed, last few tutoring turns (capped), struggle counters. Old v6 saves migrate with an empty Summit record. This is pedagogical continuity, not a student profile. Do not keep unbounded free-text.

## Adaptive behavior

Normal progress: quiet. One mistake: optional idea. Repeated fails: climb the ladder toward teaching, then scaffold. Using Summit does not change the competency target.

## Accessibility / differentiation

Typed questions, short quick actions, Explain more, vocabulary, graph/table help, evidence reminders, restated steps. The scientific standard does not drop. 44px controls. Mobile bottom sheet with sticky input. Desktop compact drawer.

## Privacy

Local save only. No accounts. No network tutor. Recent lines are capped. Do not ship student questions to a remote model in this phase.

## Curriculum traceability

Every Cedar Hollow Layer A puzzle (`CH-01`–`CH-09`) has orient / notice / reason / teach / scaffold / misconceptions / vocab in `data/summit/cedar-hollow.json`. CH-09 consumes Phase 7.9B claim judging.

## Scaling strategy

Do not clone Summit into High Country until Cedar Hollow proves context-aware tutoring without playing the game for the student. Later regions add a curriculum JSON pack and reuse the same builder → policy → provider → UI pipeline.

## Files

- `js/summit-context.js` — context builder
- `js/summit-policy.js` — intents, ladder, memory helpers
- `js/summit-provider.js` — DeterministicProvider
- `js/summit.js` — engine
- `data/summit/cedar-hollow.json` — puzzle tutoring
- `data/summit/concepts.json` — concept library
- `js/guidance.js` — Wren/interface next-action strip (not Summit)
