# Summit Tutor Architecture

Design authority for TerrainBound’s Earth Science tutor. Cedar Hollow is the vertical slice. This document does not implement High Country, Dark Sky Basin, or a required paid AI API. Hybrid tutoring is proven here with a local grounded composer; a remote model is optional behind a loopback proxy.

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
STUDENT QUESTION
        ↓
TERRAINBOUND STRUCTURED STATE
        ↓
SUMMIT CONTEXT BUILDER        (js/summit-context.js)
        ↓
TUTOR POLICY / CURRICULUM     (js/summit-policy.js, data/summit/*)
        ↓
HYBRID ROUTER                 (js/summit-route.js)
        ↓
   authored path                    conversational path
DeterministicProvider               grounding packet → AIProvider
                                    → validation
        ↓                                   ↓
        └──────── on failure ───────────────┘
                         ↓
                  SUMMIT RESPONSE
```

Game state, evidence, measurements, clearance, and competencies remain deterministic TerrainBound systems. A provider only writes tutoring language. The UI never talks to a vendor SDK.

## Core rule

The model writes the conversation. TerrainBound owns the truth.

The conversational layer may interpret messy wording, explain, ask Socratic questions, restate directions, compare evidence that exists, teach vocabulary, and connect related Earth Science ideas.

It may not authoritatively decide what the student collected, measurements, puzzle or competency completion, Wren judgment, clearance, unlocks, region progression, or grades.

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

`createDeterministicProvider` is the offline engine: intent recognition, authored puzzle lines, misconception lines, vocabulary, evidence-aware AAR help. It is not an LLM. Do not call the scripted menu an AI tutor. The game remains fully usable with this provider alone. `createSummitEngine` still defaults to it so authored tests stay honest.

## Hybrid tutoring architecture

`createHybridProvider` sits behind the same `provider.respond(request)` contract as Phase 7.9C.

| Provider | Role |
| --- | --- |
| `DeterministicProvider` | Authored Cedar Hollow lines. Offline. Default. |
| `AIProvider` | Conversational wording from a compact grounding packet. Adapters only. |
| `createHybridProvider` | Routes, validates, and falls back silently. |

Default play wiring in `game.js` uses hybrid. The engine API did not change for callers except that `ask` may return a Promise.

## AIProvider

`createAiProvider({ adapter, timeoutMs })` never holds an API key. It:

1. Uses the packet already selected by the hybrid layer (or builds one).
2. Builds a compact prompt (`buildSummitPrompt`).
3. Calls `adapter.complete({ packet, prompt, question, recent })`.
4. Parses structured output.
5. Runs `validateSummitOutput`.
6. Throws on failure so hybrid can fall back.

Adapters:

- `createLocalComposerAdapter` — grounded local composer. **Not a neural model.** Used when `data/summit/provider.json` has an empty `endpoint` (the shipped default).
- `createHttpAdapter({ endpoint })` — POST JSON to a same-origin or localhost proxy. No `Authorization` header in the browser.
- `createFixtureAdapter` — tests.

Optional Node proxy: `server/summit-proxy.mjs`. It reads `SUMMIT_API_KEY`, `SUMMIT_AI_URL`, and `SUMMIT_AI_MODEL` from the environment and binds `127.0.0.1` only. Do not commit secrets. Do not put keys in `provider.json`, frontend config, fixtures, or screenshots.

## Hybrid routing logic

`routeSummit` decides whether a turn is worth a conversational call. Not every button press hits a model.

Prefer **deterministic** (`useAi: false`):

| Reason | When |
| --- | --- |
| `first-hint` | Empty question, first authored hint |
| `quick-action` | Empty question + What should I do / notice / hint / explain |
| `vocab-library` | Clean “what is runoff?” / “what does X mean?” definition ask |
| `objective` | Exact “what am I supposed to do?” |
| `evidence-inventory` | Exact “what notes/evidence do I have” |
| `off-topic` | Sports, homework, jokes — authored tutor redirect |
| `gameplay-redirect` | Button / tap / click / pin / walk-destination asks |
| `next-action` | “what should I test next” / “what do I do next” |
| `state-honesty` | High Look, third trial, clearance, finish probes |
| `answer-ladder` | “give me the answer” / “do it for me” — authored support ladder |
| `structured-data` | Graph / compare intents that already have authored data lines |
| `default-deterministic` | Everything else that is not messy, curious, or a follow-up |

Prefer **conversational** (`useAi: true`):

| Reason | When |
| --- | --- |
| `messy-language` | Typos, fragments, “what am I even doing” |
| `follow-up` | Short thread turns (“that part”, “why though”, “why did it go faster”, “so gravity?”) |
| `rephrase` | “explain it easier / another way / explain more” |
| `curiosity` | Relevant Earth Science transfer (flash flood, snowmelt, gravity, “where I live”) |
| `science-talk` | Why/how science questions that are not gameplay or state probes |
| `why-or-reveal` | Why-wrong / evidence mismatch that still needs tutoring language |

Typed “What should I notice?” is not a quick-action. Quick-actions are the HUD buttons (`action` without a typed question). Off-topic does **not** spend a model call.

## Context-selection strategy

`selectSummitPacket` sends only what the current question needs. It does **not** dump Cedar Hollow, the full tablet, or unbounded chat.

Always included (compact): region name, puzzle title, stage, nearby places, fair-trial count, up to six fair times, a deterministic **truth packet** (`known` / `unknown` / `science` / `doNotClaim` / `comparisonValid` / `nextAction`), missing-evidence count, allowed support level.

The model does **not** receive Field Tablet titles, pin lists, or button names as things to recite. Compact facts look like `Trial 1: steep slope, 10.2 s`.

Included only when relevant:

- Wren claim, pinned titles, `lastJudge` kind/hint if AAR is open or the question is about pinning / Wren / evidence (used by the authored path; not a model evidence-reference field)
- Last **four** tutoring turns, each clipped to 220 characters, with `CH-##` stripped

Never included: student name, email, account, school, internal card ids, unused region lore, full curriculum JSON, full chat history.

## Grounding packet

The packet has two sides:

**`facts` (authoritative game state).** The conversational layer may explain these and must not change them. Example:

```
KNOWN:
- Trial 1: steep slope, 10.2 s
- Trial 2: steep slope, 10.4 s
UNKNOWN / DO NOT CLAIM:
- gentle slope: not yet measured
- High Look: not inspected
SCIENCE YOU MAY TEACH:
- gravity pulls water downhill
- steeper slopes make runoff faster, not slower
```

**`tutoring` (instructions).** Allowed support level, ladder name, do-not-reveal-cards, do-not-grant-clearance, optional concept, allowCuriosity.

If a fact is absent, the field is empty or false. Providers must not invent a third trial, a High Look view, or clearance.

## Output schema

The model is the **language layer**. Preferred adapter payload (Phase 7.9G):

```
{
  "explanation": string,
  "followUpQuestion": string,
  "concept": string,
  "supportLevel": number,
  "offTopic": boolean
}
```

`suggestedAction` and `referencedEvidence` are **not** model fields. If a next investigation is appropriate, `composeStudentVisible` appends `packet.nextAction.text` from deterministic game state.

`validateSummitOutput` reads `explanation` (or legacy `response`) and maps a valid payload onto the provider reply. Arbitrary prose is not displayed.

## Validation layer

Reject and fall back if output:

- is missing / empty / longer than 800 characters / not JSON
- contains `CH-##`, quiz stems, HTTP/API/JSON error copy
- commands a game action (`click/tap/press`, `Start Trial`, `walk to`, `speak with Wren`, `pin the … card`)
- claims to grant / unlock / complete
- claims clearance when `facts.clearance` is false
- invents measurements (recorded times not in `facts.numbers`)
- invents a High Look visit
- invents a third trial when `fairTrialCount < 3`
- claims a support level above the allowed ladder (unless already at 4)

Do not grow validator keyword lists of science terms to paper over bad model output. Gameplay language is a command category; science stays in the explanation field.

## Deterministic fallback behavior

If the network is down, the model is missing, the call times out, JSON is malformed, validation fails, the proxy returns 429/5xx, or `endpoint` is empty and no local composer is wired, hybrid catches the error and returns `DeterministicProvider` text.

Students do not see HTTP 429, API failure, JSON parsing errors, or “provider unavailable.” `fallbackReason` is stored on `summitState.lastDebug` only. Developer `?field=1` may show a quiet diag line.

## Multi-turn conversation behavior

Summit memory still caps recent turns in save (8). The packet sends the last 4. Follow-ups like “the steep one” / “why though” / “explain it easier” are routed to the conversational path so the student does not have to restate the original question. The composer (or a future model) reads those recent lines plus current measurements.

This is pedagogical continuity, not a student profile. Do not keep unbounded free-text.

## Wren / AAR protections

During the After Action Report Summit may explain why a pin did not hold. It may not select the card.

Bad: “Pin the runoff measurement card.” / “Pin CH-03.”

Good (level 2): “Wren is asking about a specific kind of evidence. Look for a note that actually answers that question.”

Good (level 4): “Your slope trials measured travel time directly. Evidence based on those measurements would address Wren's question — you still choose the note.”

Wren still judges. Summit still does not grant clearance.

## Privacy boundary

Send: the current question, selected game facts, relevant evidence titles, curriculum concept id, at most four recent tutoring turns.

Do not send: student name, email, account identifiers, school identifiers, unnecessary history, or personal information. There is no student profiling. `lastDebug` is not written into the save snapshot.

Until a classroom proxy is configured, nothing leaves the browser: the local composer runs in-process.

## Secret / API architecture

No API key in client JavaScript. `data/summit/provider.json` stores only an optional proxy `endpoint` and `timeoutMs`. A remote model, if used, is reached through `server/summit-proxy.mjs` (loopback, env key). Tests and docs must not embed credentials.

## Cost-control strategy

- Compact prompts; selected context only.
- Bounded history (4 in packet, 8 in save) and bounded output (800 chars).
- Hybrid routing skips the conversational path for vocab, first hint, objectives, and structured graph/compare asks.
- Safe in-memory cache on identical prompts (24 entries) inside `AIProvider`.
- Timeouts (~3.5s) then authored text.
- No conversational call for HUD button presses that already have authored lines.
- Design assumption: a small, inexpensive model. Do not dump the world.

## Model configuration strategy

Do not hardwire a vendor in Summit UI or the engine. Choose the adapter at the boundary (`provider.json` endpoint, or inject `adapter` into `createHybridProvider`).

`SUMMIT_MODEL_REQUIREMENTS`: inexpensive, low latency, reliable structured output, adequate instructional language, sufficient basic Earth Science, short conversational context. A huge frontier model is not required; TerrainBound supplies the facts.

## Evaluation strategy

`data/summit/eval-utterances.json` holds 75+ realistic 9th–10th-grade lines. `tests/phase7_9d.test.mjs` and `tests/phase7_9e.test.mjs` cover routing and architecture. Live model evaluation is `tests/phase7_9e-live.mjs` (environment credentials; loopback proxy). Hallucination probes must not invent facts.

## Phase 7.9E real-model pilot

Connect **one** lightweight model through `server/summit-proxy.mjs`. The browser never sees a vendor URL or API key. Use `?summit=ai` to point the game at `provider.json` `proxyEndpoint` (`http://127.0.0.1:8787/summit-ai`). Leave `endpoint` empty so offline play still uses LocalComposer.

The proxy forwards only `prompt` + `question` (plus the compact packet is **not** sent upstream). It requests JSON-schema / JSON-object replies, strips markdown fences, and returns usage/latency metadata. `SUMMIT_DEBUG=1` writes redacted meta to `server/.summit-debug.log` (gitignored) — not student transcripts.

Validation now also rejects agreeing with false numeric premises, false clearance/High Country-open claims, invented rainfall/water-level observations, and off-topic answers that do not redirect to the tutor role. Invalid model text never reaches the student; DeterministicProvider speaks instead. Empty `response` fields are retried once at the proxy, then rejected.

This pilot is not a production declaration. Cedar Hollow only.

## Phase 7.9F hosted small-model bakeoff

Do not promote local `llama3.2:3b`. Compare **at most two** hosted lightweight models through the same loopback proxy (`SUMMIT_AI_URL`, `SUMMIT_API_KEY`, `SUMMIT_AI_MODEL`). Candidates and published list prices live in `data/summit/bakeoff.json` (no keys). Live runner: `tests/phase7_9f-live.mjs`. Evidence: `tests/evidence/phase79f/`.

A candidate may become the Cedar Hollow conversational default only if median latency ≤ 3s, gameplay facts stay grounded, follow-ups stay on slope/gravity/runoff, validator rejection ≤ 10%, and cost is classroom-viable. Cheap or fast alone is not enough.

**7.9F hosted result (Groq, 2026-09-11, pass 2):** neither `openai/gpt-oss-20b` nor `qwen/qwen3.6-27b` is the Cedar Hollow conversational default. GPT-OSS 20B is the better of the two when a reply lands (blind 10–1, cheaper, stronger slope/gravity when unblocked). Qwen’s raw science is often fine but `unknown-evidence` rejected 30/55 parsed outputs (54.5%). Both invented student-visible gameplay (tap/click instructions; High Look / Wren permission). Successful model latency meets median ≤ 3s and p95 ≤ 5s; eval timeouts (29 and 17 of 72 AI-routed turns at 15s) would be authored fallbacks at the game’s 5s timeout. Validator rejection 20.9% / 54.5% misses the ≤10% bar. Do not student-test yet. Details: `tests/evidence/phase79f/`.

## Phase 7.9G constrained conversation

Do not shop models. Keep `openai/gpt-oss-20b` through the same Groq loopback proxy. The model may only write Earth Science explanation language. TerrainBound remains authoritative for game state, observations, measurements, evidence, locations, puzzle stage, next actions, UI, Field Tablet, Wren, progression, and clearance.

Pipeline:

```
deterministic game state
  → deterministic pedagogy / truth packet
  → model writes explanation / follow-up question only
  → TerrainBound composer may append a valid next investigation
  → validation
  → student
```

Timeout diagnosis from 7.9F: successful Groq replies were usually <1.5s, but many eval calls sat until the **client** AbortController at 15.015s. The proxy `fetch` to Groq had no abort, so a hung upstream plus json_schema → json_object → plain chaining burned the student wait. 7.9G caps upstream at ~4s (`SUMMIT_UPSTREAM_TIMEOUT_MS`), skips extra modes if the budget is spent, and aborts Groq when the client disconnects. In-game timeout stays **5000ms**. Do not raise it to hide hangs.

Live eval: `tests/phase7_9g-live.mjs` (GPT-OSS only, 5s, no 429 backoff). Evidence: `tests/evidence/phase79g/`. Constrained utterances: `data/summit/eval-constrained.json`.

## Phase 7.9H science precision

Do not shop models. Keep the 7.9G language-layer contract. This pass adds structured Cedar Hollow concept truth so Summit can distinguish measured facts from scientific expectations.

Deterministic objects:

- `comparisonStatus`: `{ variable: "slope", steepMeasured, gentleMeasured, comparisonReady }`
- `known` / `expected` / `unknown` lists from the trial log, not from student prose
- `evidenceStatus`: observed, measured, predicted, inferred, not yet tested
- compact concept claims for slope, fair-test, and observation vs interpretation

When `comparisonReady` is false, Summit may discuss measured steep times, explain a fair comparison, ask what to test next, or help form a prediction. It must not treat two steep trials as steep-versus-gentle, invent a gentle result, or explain steepness as a longer path. Gravity strength stays constant; more of the same pull acts downhill on a steeper surface.

Concept checks are state-based (`path-length-mechanism`, `gravity-strength`, `unready-comparison`, `split-steep-trials`). They are not a growing science-phrase blacklist.

Fair-test and epistemic asks stay deterministic. Slope “why” questions may still use GPT-OSS as the language layer.

Live eval: `tests/phase7_9h-live.mjs`. Science utterances: `data/summit/eval-science.json`. Evidence: `tests/evidence/phase79h/`.

## Phase 7.9I supervised field test

Do not retune Summit against synthetic evals. `?summit=fieldtest` is an explicit opt-in: hosted GPT-OSS when the loopback proxy is configured, plus an anonymous local session log and optional observer marks. Normal loads stay unchanged. The model still writes language only. Wren still grants clearance.

See `docs/SUMMIT-FIELD-TEST.md`. Evidence: `tests/evidence/phase79i/`.

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

## Developer diagnostics

`?field=1` may show `#summit-diag` with provider/adapter, authored vs conversational path, intent, support level, route reason, validation/fallback, and a short list of packet fact keys. `window.TB.summitDebug` exposes the same record. Normal student UI leaves this hidden. Do not put HTTP errors in the student log.

## Privacy

See **Privacy boundary** above. Local save only. No accounts. Recent lines are capped. A remote model is optional and must go through a server-side proxy; the shipped game does not send student text off-machine.

## Curriculum traceability

Every Cedar Hollow Layer A puzzle (`CH-01`–`CH-09`) has orient / notice / reason / teach / scaffold / misconceptions / vocab in `data/summit/cedar-hollow.json`. CH-09 consumes Phase 7.9B claim judging.

## Scaling strategy

Do not clone Summit into High Country until Cedar Hollow proves context-aware tutoring without playing the game for the student. Later regions add a curriculum JSON pack and reuse the same builder → policy → provider → UI pipeline.

## Files

- `js/summit-context.js` — context builder
- `js/summit-policy.js` — intents, ladder, memory helpers
- `js/summit-provider.js` — DeterministicProvider
- `js/summit-packet.js` — compact grounding packet
- `js/summit-route.js` — hybrid router
- `js/summit-ai.js` — AIProvider, prompt, HTTP/fixture adapters
- `js/summit-truth.js` — deterministic known / expected / unknown / science / next-action packet
- `js/summit-concepts.js` — compact concept claims, comparisonStatus, epistemic lists
- `js/summit-science.js` — state-based concept claim checks
- `js/summit-compose.js` — local grounded composer (not an LLM) plus student-visible compose
- `data/summit/eval-constrained.json` — 7.9G constrained evaluation set
- `data/summit/eval-science.json` — 7.9H Cedar Hollow science evaluation set
- `tests/phase7_9g.test.mjs` — constrained architecture
- `tests/phase7_9g-live.mjs` — GPT-OSS-only live eval (env credentials)
- `tests/phase7_9h.test.mjs` — science-precision architecture
- `tests/phase7_9h-live.mjs` — GPT-OSS science-precision live eval (env credentials)
- `tests/evidence/phase79g/` — 7.9G evidence
- `js/summit-fieldtest.js` — anonymous supervised field-test log, marks, and summaries
- `docs/SUMMIT-FIELD-TEST.md` — human field-test script
- `tests/phase7_9i.test.mjs` — field-test harness
- `tests/evidence/phase79h/` — 7.9H evidence
- `js/summit-validate.js` — grounding gate
- `js/summit-hybrid.js` — route → AI or authored → fallback
- `js/summit.js` — engine
- `data/summit/cedar-hollow.json` — puzzle tutoring
- `data/summit/concepts.json` — concept library
- `data/summit/curiosity.json` — compact transfer explanations
- `data/summit/provider.json` — adapter endpoint (empty by default)
- `data/summit/eval-utterances.json` — evaluation set
- `data/summit/eval-bakeoff-extra.json` — 7.9F targeted extras
- `data/summit/bakeoff.json` — hosted candidate ids and list prices (no keys)
- `server/summit-proxy.mjs` — optional loopback proxy
- `tests/phase7_9e.test.mjs` — architecture and fallback tests
- `tests/phase7_9e-live.mjs` — live remote-model evaluation (env credentials)
- `tests/phase7_9f.test.mjs` — hosted bakeoff architecture
- `tests/phase7_9f-live.mjs` — two-model hosted bakeoff (env credentials)
- `tests/evidence/phase79e/` — 7.9E live metrics, teacher review, captures
- `tests/evidence/phase79f/` — 7.9F bakeoff evidence
- `js/guidance.js` — Wren/interface next-action strip (not Summit)
