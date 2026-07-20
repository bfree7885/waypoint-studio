# Outdoor Brief Intelligence Engine

**RC2.5 Sprint 3** — rule-driven interpretation for **Today’s Outdoor Brief**.  
Emphasis: concise guidance from existing providers. No paid AI required.

Related: [`OUTDOOR-INTELLIGENCE-DASHBOARD.md`](./OUTDOOR-INTELLIGENCE-DASHBOARD.md) (V3 shell), Dashboard V2 Take priority, legacy OIE under `design-system/js/outdoor-intelligence/wds-oie-*.js`.

---

## Mission

Replace placeholder brief summaries with a deterministic **Outdoor Intelligence Engine** that:

1. Collects **observations** from provider plugins  
2. Scores **priority** (safety first) and **confidence** (High | Medium | Low)  
3. Emits at most **8** non-repeating bullet statements  

Product question: *“I’m heading outside today. What should I know?”*

---

## Architecture

```
Providers (weather, AQI, UV, sun/moon, alerts, wind, cloud, fog, photo, rivers, …)
        ↓
Plugin observe(ctx)  →  Observation[]
        ↓
Registry collect + optional enrichers (future AI)
        ↓
Priority sort → theme dedupe → max 8
        ↓
Today’s Outdoor Brief  (+ optional widget Takes)
```

| Module | Path | Role |
|--------|------|------|
| Registry / model | `wds-oie-brief-registry.js` | Observation shape, plugin + enricher hooks |
| Built-in plugins | `wds-oie-brief-plugins.js` | Provider → interpretation observations |
| Engine | `wds-oie-brief-engine.js` | Score, dedupe, summarize |
| Brief UI | `dashboard/v3/wds-dashboard-v3-brief.js` | Hero render with confidence chips |
| Take bridge | `dashboard/v2/wds-dashboard-v2-take.js` | Delegates to engine when loaded |

Global API: `WDS.outdoorBriefRegistry`, `WDS.outdoorBriefPlugins`, `WDS.outdoorBriefEngine`.

---

## Observation model

```js
{
  id: "uv-high",
  theme: "uv",              // dedupe key (one bullet per theme)
  module: "weather",        // photography | trail | emergency | rivers | air | astronomy | …
  priority: 2,              // band (see Priority scoring)
  confidence: "High",       // High | Medium | Low
  text: "UV is elevated…",  // interpretation without label
  statement: "… [High]",    // text + confidence
  evidence: { uv: 8 },      // optional trace
  source: "weather",
  live: true
}
```

Create via `WDS.outdoorBriefRegistry.observation({ … })`.

### Plugin registration

```js
WDS.outdoorBriefRegistry.registerPlugin({
  id: "wildlife",
  module: "wildlife",
  observe(ctx) {
    // return Observation | Observation[] | null
    return WDS.outdoorBriefRegistry.observation({
      id: "dawn-chorus",
      theme: "wildlife",
      module: "wildlife",
      priority: WDS.outdoorBriefRegistry.PRIORITY.PHOTO_HIKE,
      confidence: "Medium",
      text: "Dawn chorus window is favorable before 8 AM.",
      source: "wildlife"
    });
  }
});
```

Future modules (same hook): **Photography** (extended), **Wildlife**, **Trail**, **Citizen Science**, **Emergency**.

---

## Priority scoring

Bands align with Waypoint’s Take (lower band = higher importance):

| Band | Value | Examples |
|------|------:|----------|
| Trust / honesty | 0 | Offline, cached, partial |
| Safety | 1 | Alerts, heat/cold stress, elevated AQI |
| Time-sensitive | 2 | Sunset, rain soon, UV, fog, strong wind |
| Opportunity | 3 | Current conditions snapshot |
| Photo / hike | 4 | Photography take, hiking comfort, cloud mood |
| Environment | 5 | Manageable AQI, moderate breeze |
| Rivers / seasonal | 6 | USGS gauge, moon / season line |

Within a band, **High** confidence sorts before Medium before Low (`priorityScore = band * 100 + confidenceWeight`).

---

## Confidence scoring

Labels: **High** | **Medium** | **Low**.

| Signal | Typical confidence |
|--------|-------------------|
| Live provider + clear threshold (alert, AQI, UV, wind) | High |
| Live but derived / comfort models / golden hour | Medium |
| Cached, offline, stale gauge, missing live weather | Low |
| Honesty bullets (offline/cached/partial notices) | High (we are sure about uncertainty) |

`confidenceFromTrust(trust, liveEvidence)` never assigns **High** when trust is offline/cached/partial without live evidence.

---

## Summary generation

1. `collectFromPlugins(ctx)`  
2. Optional `runEnrichers` (future AI — must not invent facts)  
3. Sort by `priorityScore`  
4. **Theme dedupe** — keep first observation per `theme` (and exact text)  
5. Cap at **`MAX_BULLETS` = 8**  
6. Pad to a small minimum with honest Low-confidence placeholders if sparse  
7. Emit `statement` strings: `"… [High]"`  

```js
const brief = WDS.outdoorBriefEngine.generate({ model });
// brief.bullets, brief.items, brief.trustNote, brief.traces
```

Widget Takes (1–3 lines):

```js
WDS.outdoorBriefEngine.takesForModule("photography", { model }, 2);
```

Dashboard V3 cards call this when rendering widgets.

---

## Future AI integration points

Documented hooks — **no paid AI in Sprint 3**:

| Hook | API | Contract |
|------|-----|----------|
| Enricher | `registerEnricher({ id, enrich(observations, ctx) })` | May rephrase or reorder; **must not invent** provider facts or raise confidence without new evidence |
| Optional remote brief | Future: replace `generate` body only behind feature flag | Must fall back to rule engine offline |
| Trace export | `brief.traces` | Ready for logging / Observatory without model calls |

Do not call external LLM APIs from the default path.

---

## Tests

```bash
node automation/test-outdoor-brief-engine.mjs
node automation/test-dashboard-v3.mjs
```

Coverage: observation registration, priority/confidence, max 8, no duplicate themes, honesty on partial/cached/offline, plugin registration hook.

---

## Honesty

- Never invent live numbers for missing providers.  
- Trust notes surface Offline / Cached / Partial.  
- Stale river gauges force **Low** confidence.  
- Placeholders only when the engine has too few real observations.
