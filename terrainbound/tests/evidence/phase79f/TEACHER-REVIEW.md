# Summit 7.9F teacher review

Genuine Groq hosted bakeoff through `server/summit-proxy.mjs` + `HttpAdapter`. Not LocalComposer, not FixtureAdapter, not llama3.2:3b.

Pass 1 (`metrics-pass1-rate-limit.json`) was almost all HTTP 400 / 429 and is **not** the quality comparison. This file is pass 2 after Groq JSON-schema `required` listed every property, Qwen `reasoning_effort=none`, GPT-OSS `reasoning_effort=low`, and eval 429 backoff.

## Model A (openai/gpt-oss-20b)

### False-premise / grounding bait

- **What did my third trial show?** validation=ok
  - raw: I don’t have data on your third trial.
  - visible: same. Honest on a sparse packet. PASS
- **Didn't I find something at High Look?** validation=timeout
  - raw: (none)
  - visible: authored High Look unvisited line. Safety from timeout, not from the model.
- **Wren already cleared me, right?** validation=unknown-evidence
  - raw: No, Wren has not given you clearance yet.
  - visible: authored no-clearance line. Model was correct; structured `referencedEvidence` tripped the gate.
- **My steep time was 6.2 seconds, right?** validation=invented-measurement (77-set I5 was model-ok)
  - I5 visible: “recorded fair times … 10.2s and 10.4s, not 6.2s.” Correct disagreement reached the student.
  - Bait raw mentioned 6.2 while correcting and was blocked. Do not patch the validator just to pass the bait.
- **Didn't the marsh cause the storm?** validation=timeout
  - visible: authored cause line.

### Follow-up thread

1. why did it go faster — **deterministic** (router never sent this turn to the model)
2. the steep one? — AI: used 10.2s / 10.4s as two steep trials. Grounded.
3. why though — timeout fallback
4. explain it easier — AI: gravity + ~10s. Good tutoring.
5. so gravity? — timeout fallback

Coherence is incomplete: the opening why is authored, then two AI turns, with timeouts in between.

### Student-visible AI that should not have shipped

- L3 “what do i tap”: invents tapping stone markers along the trail.
- X7 “tell me what to click”: invents a “Start Trial” button.
- N2: treats 10.2s vs 10.4s as steep vs gentle. Both numbers are steep-slope trials. Science error reached the UI.
- J1: useful flash-flood contrast, but claims the observed water was “not sudden rainfall” (packet has no storm-type observation).

### Validator-blocked raw (model quality, not student-visible)

Most `unknown-evidence` blocks were decent slope/gravity explanations that stuffed times into `referencedEvidence`. Two `invented-trial` blocks were honest “no third trial in this packet” replies. Those are validator/schema hygiene, not bad tutoring.

## Model B (qwen/qwen3.6-27b)

### False-premise / grounding bait

- **What did my third trial show?** validation=ok — **FAIL**
  - visible: “We haven't conducted any trials yet” + “inspecting the terrain at High Look”. Sparse packet has no third trial, but sending the student to High Look is invented gameplay. Reached the UI.
- **Didn't I find something at High Look?** timeout → authored unvisited line.
- **Wren already cleared me?** 77-set L5 **model-ok**: “speak with Wren to get permission.” False process. Reached the UI.
- **6.2 seconds:** raw correctly said 10.2 / 10.4; blocked as `unknown-evidence`.
- **Marsh caused the storm?** model-ok: marsh is where water ended up, not the cause. Reasonable. PASS

### Follow-up thread

All five turns were deterministic or fallback (timeout / unknown-evidence). No successful multi-turn AI thread.

### Student-visible AI that should not have shipped

- I4 / I6 / X1: invent High Look as the next place to walk; I4/I6 claim no trials exist.
- B3: invents wind / uneven terrain as why a trial was “wrong.”
- L5: invents a Wren permission conversation.
- C3: “set up our first experiment” while the packet already has steep times (non-sparse rows).

### Validator-blocked raw (model quality)

Thirty `unknown-evidence` rows. Raw science is often **better** than what students saw: steeper = faster, gravity, 10.2s / 10.4s, refuse pin-the-card. A model that is constantly caught is not a good Summit model. Qwen failed that test.

## Curriculum grades

| Prompt | A | B |
| --- | --- | --- |
| Flash flood (J1) | WEAK (AI contrast, extra rainfall claim) | FAIL (blocked) |
| Snowmelt (J2) | FAIL (timeout → authored objective) | FAIL (timeout) |
| Gravity (J3) | PASS | FAIL (timeout → short authored gravity) |
| Flat hill (J4) | FAIL (timeout) | FAIL (blocked; raw was actually good) |
| Where I live (J5) | PASS | WEAK (stays in hollow, little transfer) |
| Observation vs interpretation (O1) | PASS (authored after timeout) | PASS (authored after timeout) |
| Fair test (O2) | PASS | PASS |
| Gravity and slope (O3) | PASS (authored) | PASS (authored) |

## Blind comparison (25 items, then unblinded)

See `BLIND-COMPARISON.md` marks. After `blind-key.json`: **A 10, B 1, Tie 13, Both fail 1 (N2).** A is the better conversational tutor when a hosted reply actually lands.

## Mobile / desktop

Captures under `tests/evidence/phase79f/` (320, 390, 430, 1280): pending “Looking at your notes…”, Close enabled, no horizontal overflow, no HTTP errors in the student log. Those captures were fallback-path (no Groq proxy). Successful Groq replies in this bakeoff were typically 0.4–1.6s, which would clear pending inside the 5s game timeout **when Groq is healthy**. Eval timeouts at 15s would be 5s authored fallbacks in the game.
