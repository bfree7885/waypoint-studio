# Summit architecture — current and contextual

**Status:** Phase B (contextual model extended; engine unchanged)  
**Date:** 2026-09-14  
**Not merged. Not deployed.**

This document describes Summit as it ships today and the contextual architecture for a TerrainBound-wide tutor. It does not replace [`terrainbound/docs/SUMMIT-TUTOR-ARCHITECTURE.md`](../../terrainbound/docs/SUMMIT-TUTOR-ARCHITECTURE.md), which remains the Cedar Hollow / hybrid-pipeline authority.

Product framing: [`TERRAINBOUND-LEARNING-ENVIRONMENT.md`](TERRAINBOUND-LEARNING-ENVIRONMENT.md). Curriculum spine: [`CURRICULUM-ARCHITECTURE.md`](CURRICULUM-ARCHITECTURE.md).

---

## What exists today

Summit is an **in-game overlay**. There is no standalone Ask Summit page.

### Entry

- HUD `#summit-toggle`
- AAR `#aar-summit`
- `game.js`: `openSummit`, `askSummit`, `closeSummit`, `renderSummit`
- `ui.js`: `showSummit` paints the sheet and focuses `#summit-ask`

### Modules (`terrainbound/js/summit*.js`)

| File | Job |
| --- | --- |
| `summit.js` | Engine: context → policy → hybrid provider |
| `summit-runtime.js` | production / local-ai / fieldtest / offline |
| `summit-context.js` | `createSummitState`, Cedar Hollow `buildSummitContext` |
| `darksky.js` | `buildDarkSkySummitContext` when the region is Dark Sky Basin |
| `summit-packet.js` | Compact grounding packet |
| `summit-policy.js` | Intent, hint ladder, memory |
| `summit-route.js` | AI vs authored |
| `summit-hybrid.js` | Route, validate, silent fallback |
| `summit-provider.js` | Deterministic authored tutor |
| `summit-ai.js` | HTTP adapter, prompt, no keys |
| `summit-validate.js` | Grounding gate |
| `summit-character.js` | One Sasquatch voice |
| `summit-fieldtest.js` | Opt-in observer harness |

### Runtime

On `terrainbound.org`, Summit POSTs to:

`https://terrainbound-summit.bfree7885.workers.dev/summit`

Localhost defaults **offline** (deterministic + local composer). `?summit=local` forces offline. `?summit=ai` / `?summit=fieldtest` remain development flags.

The browser never holds `SUMMIT_API_KEY`. Failed hosted calls fall back to authored copy. Students do not see Groq, HTTP, or JSON errors.

### Conversation state

`createSummitState()` persists inside the TerrainBound save (`localStorage`, last ~8 turns). It is pedagogical continuity, not an account.

### Context today

`game.js` `summitContextInput()`:

- Dark Sky Basin → `buildDarkSkySummitContext`
- Cedar Hollow (and default) → `buildSummitContext`
- High Country / Sunfall → Summit currently orients that this tutor slice is Cedar Hollow / Dark Sky, not a full Topic 2 / Topic 10 tutor

Summit **cannot operate outside the game** until Phase D: no route, no shell, context requires live game objects.

### Identity rules that stay

- Wren judges and grants clearance. Summit does not.
- The model writes language. TerrainBound owns facts.
- Do not invent measurements, visits, nm values, or clearance.
- Guide; do not complete the puzzle.

---

## Proposed SummitContext

`terrainbound/js/learning.js` — **not imported by `game.js`**.

```
{
  schemaVersion: 2,
  contextType: "game" | "curriculum" | "story" | "video" | "general",
  topicId,
  conceptIds,
  standardIds,
  regionId,
  investigationId,
  storyId,
  resourceId,
  videoId,
  studentProgress: { masteredTopicIds, accessibleRegionIds, currentRegionId, currentTopicId },
  allowedAssistance: "guide" | "explain" | "connect",
  doNotRevealAnswers: true,
  doNotGrantClearance: true,
  studentFacingStandards: false
}
```

`standardIds` are for the engine, never for the student transcript. Summit may know “this student is on Topic 11 asking about spectra.” Summit must not recite HS-ESS codes.

Helpers: `curriculumSummitContext`, `attachCurriculumToSummitContext`. Still **not imported by `game.js`**. Phase D wires this beside `summitContextInput()`.

One identity. The same hybrid engine. Different **context builders** fill the object:

| contextType | Builder (future) | Packet facts |
| --- | --- | --- |
| `game` | Existing `buildSummitContext` / `buildDarkSkySummitContext` | Region, puzzle, evidence, unknown |
| `curriculum` | Topic + concept library | Topic title, concept truth, no fake field notes |
| `story` | Curated ScienceStory | What happened, known science, unknown |
| `video` | VideoResource + optional DFD id | Title, topic links, timestamp if any |
| `general` | Empty progress | Course-level science; still no invented data |

Phase D should pass `SummitContext` into `selectSummitPacket` as an additive `facts.learning` slice. It must not replace Dark Sky / Cedar Hollow packets.

Conversation (`summitState.recent`) should persist when the student moves from Field → Course → Watch, and restore the previous surface on close.

---

## Mobile Summit findings

### Current layout

- Desktop: right-side sheet, `max-height` ~38rem, sticky `#summit-form`
- Narrow (`max-width: 900px`): bottom sheet ~78dvh, 44px controls, safe-area padding
- Short landscape (`max-height: 500px`): hide `.summit-lead`, shrink log, still a sheet on top of the canvas
- `#summit:not([hidden])` is a full-bleed overlay; the canvas keeps running underneath
- `window.visualViewport` already resizes the **canvas**. Until Phase A it did **not** size the Summit sheet

### Why the keyboard eats the conversation

On phones, especially landscape:

1. The layout viewport (`100dvh`) often stays tall while the software keyboard covers the bottom.
2. The sticky form sits at the bottom of the sheet, which sits at the bottom of that tall overlay.
3. The keyboard therefore covers Ask + recent turns.
4. Nested overflow (`.summit-log` + `.summit-quick`) fights the browser’s attempt to scroll the focused input into view.

This is a geometry problem, not a missing feature.

### Phase A change (isolated)

- `#summit` records `data-summit-layout="sheet"` so a later fullscreen mode has a hook.
- CSS uses `--summit-vvh` and `--summit-keyboard-inset`.
- `syncSummitViewport()` (called from the existing `resize` / `visualViewport` listener) sets those variables from `visualViewport.height` and the overlap with `innerHeight`.
- Desktop look stays a right-side sheet. No new colors, type, or chrome.

### Proposed later architecture (Phase D)

| Viewport | Layout | Close |
| --- | --- | --- |
| Phone portrait / landscape | `data-summit-layout="fullscreen"`: Summit is the only interactive surface; game paused visually but state frozen | Close restores camera, overlays, and focus |
| Tablet / desktop | Keep sheet/panel | Same |

Requirements that must hold:

- Conversation persists (`summitState`)
- Game/context freeze while open (`overlayBlocks` already treats Summit as blocking)
- Keyboard never covers the focused input (visualViewport + fullscreen column: log flexes, form at visual viewport bottom)
- Safe-area insets on Close and Ask
- 44px targets
- Single scroll root (the log), not sheet + log + quick + page

Do **not** implement fullscreen in Phase A. The attribute and viewport variables are the foundation.

---

## Worker / hosting

Unchanged. Do not modify the Worker for learning-environment work unless production Summit is broken.

Pages remain static. Learning JSON is publishable (`data/learning/`) and contains no secrets.

---

## Wiring plan

1. Keep `askSummit` as the only student-facing ask path.
2. Add `toSummitContext(gameInput)` in Phase D; call it beside `summitContextInput()`.
3. When Field Station exists, open the same `#summit` node from Course / Watch with a different `contextType`.
4. Only then consider a dedicated `/ask/` URL, still loading the same engine.
