# Worth Noticing Engine V1

**Document id:** `WAYPOINT-OBSERVATION-ENGINE.md`  
**Status:** Active foundation  
**Working name:** Worth Noticing Engine  
**Tagline:** Context-aware observations — never notifications.

This is the shared engine that helps every Waypoint product quietly point out things that may be worth noticing.

It is **not** a notification system.  
It is **not** an engagement loop.  
It is **not** streaks, tips-of-the-day, homework, or “daily challenges.”  
It is **not** designed to maximize opens.

It is a calm ranger walking beside the user — free to ignore.

---

## Mission

Every Waypoint product should occasionally make the user stop and think:

> “I never would have noticed that.”

Not because AI generated trivia — because something genuinely interesting is happening.

If nothing meaningful exists: **say nothing.**  
Silence is preferable to filler. Quality beats frequency.

---

## Philosophy

| Always | Never |
|--------|--------|
| Point out what may matter | Interrupt |
| Explain why | Nag |
| Leave the decision with the user | Pressure return |
| Enrich curiosity | Drive engagement |
| Feel dismissible | Feel like an alert or breaking news |

Users should never feel behind, never feel they missed something, never feel obligated to open the app.

Inherits: [Waypoint Constitution](WAYPOINT-CONSTITUTION.md) · [Guide Experience](WAYPOINT-GUIDE-EXPERIENCE.md) · [AI Principles](WAYPOINT-AI-PRINCIPLES.md).

---

## Replace generic tips

| Avoid | Prefer |
|-------|--------|
| Tip of the day | Worth noticing |
| Daily challenge | Interesting today |
| Today’s homework / lesson / exercise | Current conditions |
| Practice / achievement | Recent research · Something changed · Background · Context |

---

## Observation structure

Schema: `design-system/worth-noticing/schema-v1.json`  
Ids: `wn_*`

| Field | Role |
|-------|------|
| title | Short noticing headline |
| observation | What we’re seeing (no conclusion yet) |
| whyItMatters | Context and relationships |
| confidence | Optional 0–1 or labeled band |
| evidence | Supporting signals / facts |
| relatedResearch | Optional `wk_*` curated ids |
| deeperReading | Optional links / hooks |
| expiresAt | When this stops being timely |
| products | Apps this may appear in |
| topics | Subject tags |
| locationRelevance | none · regional · local · precise (privacy-aware) |
| sources | References |
| presentation | worth-noticing · interesting-today · current-conditions · … |

### Presentation shape

Prefer Guide Pattern beats when rendering:

1. Worth noticing (title + observation)  
2. Why it matters  
3. If you’re curious (related research / deeper reading)

Use `WDS.worthNoticing.render()` or `WDS.guideCard.render(WDS.worthNoticing.toGuideCard(obs))`.

---

## Generation inputs

The engine may consider (when available):

Weather · season · location (when appropriate) · phenology · curated research · user observations · historical observations · wildlife activity · photography conditions · environmental change · astronomical events · radio / space-weather conditions · cyber advisories · (future) geopolitical context · species activity

Products never invent certainty. Missing inputs → fewer candidates → more silence.

---

## Quality rules & scoring

Config: `design-system/worth-noticing/quality.json`

**Hard gates (fail → discard):**

- Pressure / school language (`assignment`, `homework`, `you must`, streaks, FOMO)  
- Empty observation or empty why  
- Expired (`expiresAt` in the past)  
- Explicit `reviewStatus: demonstration` only allowed on demo surfaces  

**Score dimensions (0–1 each, weighted):**

| Dimension | Asks |
|-----------|------|
| specificity | Is this about *today/this context*, not a generic tip? |
| evidence | Are supporting signals present? |
| uncertainty | Is confidence honest when claims are soft? |
| autonomy | Does copy leave choice with the user? |
| productFit | Does it match the active product? |
| freshness | Is it still timely? |

**Silence threshold:** if best candidate score &lt; `minimumScore`, return **no observation**.

---

## Runtime API

```js
const WN = WDS.worthNoticing;
const bundle = await WN.loadSamples();
const ctx = { product: "sheds", season: "winter", signals: { nightsAboveFreezing: 3, aspect: "south" } };
const picked = WN.select(bundle.observations, ctx);
// picked === null when silence is correct
if (picked) {
  mount.innerHTML = WN.render(picked.observation, { dismissible: true });
}
```

Helpers: `score`, `select`, `matchRules`, `render`, `toGuideCard`, `hasPressureLanguage`.

Package: `design-system/js/worth-noticing/wds-worth-noticing.js`  
CSS: `design-system/css/wds-worth-noticing.css`  
Rules: `design-system/worth-noticing/rules/generation-rules.json`  
Samples: `design-system/worth-noticing/samples/demo-observations.json`

---

## Product examples

| Product | Example noticing |
|---------|------------------|
| Sheds | Several nights stayed above freezing — south aspects may warm first |
| Photo Coach | Overcast light softens woodland contrast |
| Fieldry | Milkweed entering a regionally important growth stage |
| ForageCast | Soil and rain timing shift fruiting odds (relative) |
| SignalTerrain | Solar activity rose overnight — HF may differ from yesterday |
| Scenes / Hidden Landscapes | Spectral or light conditions that change what a place reveals |

---

## UX contract

- Small · calm · interesting · easy to dismiss  
- Never looks like a system alert or push notification  
- Never counts missed days  
- Never ranks users  
- Optional deep reading only  

---

## Future expansion (same model)

Cross-product noticing · personalization · research integration · historical comparisons · seasonal timelines · animal vision · global / cyber awareness  

Add inputs and rule packs — do not invent a second competing tip system.

---

## Related

- [Guide Experience](WAYPOINT-GUIDE-EXPERIENCE.md)  
- [Outdoor Intelligence](../design-system/outdoor-intelligence/README.md) (when present)  
- [Knowledge Platform](WAYPOINT-KNOWLEDGE-PLATFORM.md)  
- [Platform Engines](PLATFORM-ENGINES.md)  
- [Constitution](WAYPOINT-CONSTITUTION.md)  
