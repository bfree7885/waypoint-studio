# Dashboard Outdoor OS — Milestone 2 Owner Review

**Date:** 2026-07-22  
**Status:** STOP — **Milestone 2 closeout complete; awaiting owner approval.**  
**Do not deploy. Do not merge. Do not begin Milestone 3.**  
**Authority:** Manifesto → Screen Specification → Architecture Reset  

---

## Verdict

Milestone 2 Waypoint Intelligence (PriorityRanker) is closed out against the seven owner decisions. Calm days prefer a walk; photography requires a notable light advantage; Flood Watch is precautionary; dew point is honest about derivation; material provider conflicts surface uncertainty without naming providers; drought does not equal stay indoors; timing uses practical windows.

**Awaiting owner approval before any Milestone 3 work.**

---

## Milestone 2 Closeout Report

### 1. Exact reasoning changes

| Area | Before | After (closeout) |
|------|--------|------------------|
| Calm-day Do | Ordinary “good” photo often won Do (“Photography in golden light”) | Ranking R1: walk/outdoor action first; photography only when **excellent / notable** advantage |
| Flood Watch Do | Generic alert path: “Postpone exposed travel…” | Precautionary: “Avoid low crossings and check local updates before heading near streams.” Escalate only for Flood Warning / active flooding |
| Dew point | Always Magnus estimate; `estimate: true` only | Prefer provider dew; else calculate only from fresh valid temp+RH; skip if stale/not-live; mark `derived` / never `observed`; qualitative copy |
| Provider conflict | Any conflict flag → high uncertainty + triad clutter | **Material** → uncertainty + resilient Do, no provider names; **minor** → silent in triad |
| Drought / heat | Heat ≥90°F feels; drought still outdoor | Documented R2 band; drought alone never avoid-outdoors; heat primary at ≥90°F feels (or ≥88°F + oppressive humidity / heat alert) |
| Timing windows | Clock strings (`~8:05pm`, `3:00 PM–5:00 PM`) | Practical bands (early morning, through late morning, before noon, early afternoon, after 4 PM, near sunset, this evening); sunrise/sunset exact OK |
| Voice | Mostly calm; some robotic defaults | V1 bans promotional phrases; observation → consequence → action; no provider names in triad |

**Code:** `design-system/js/dashboard/os/wds-dashboard-os-interpret.js`  
**Model:** provider `dewPointF` passthrough in `wds-dashboard-v2-model.js`

---

### 2. Final documented ranking rules

Exported as `WDS.dashboardOSInterpret.RULES` (ids **R1**, **R2**, plus M2/D6):

1. **Safety / constraints** — alerts, storms, Flood Warning / active flood, severe AQI/smoke, extreme heat/cold, ice/snow footing  
2. **Exceptional time-sensitive opportunity** — notable photography (excellent light / explicit notable advantage)  
3. **Broadly useful outdoor action** — walk / easy hike in mild–warm air  
4. **Photography only when genuinely notable** — light/cloud/fog/wildlife/seasonal/visibility/water advantage; **not** ordinary calm “good” light  

Ordinary calm day default Do: *“Take a walk during the mildest part of the day”* (or a practical band when timing data supports it).  
No activity-preference UI in M2.

---

### 3. Final uncertainty rules

| Class | Behavior |
|-------|----------|
| **Material disagreement** (timing / severity / safety / action; precip-signal conflict; explicit material flag) | Elevate uncertainty; Matters may say sources disagree / plans provisional; Do softens (`If conditions hold…`); **never** provider names in Happening / Matters / Do |
| **Minor provider differences** | Precedence/confidence only; **no** triad commentary |
| **Stale / cached / partial** | Honest level + reasons in traces; soften Do when high; omit unknown domains |
| **Sources panel** | Only place for provider identity |

---

### 4. Final safety precedence rules

- Official alerts and storms outrank recreation and photography  
- **Flood Warning / active flooding** → escalate (“Stay clear of flooded roads and low crossings”)  
- **Flood Watch alone** → precautionary water language — not stay-home / not “flooding everywhere”  
- Severe AQI / smoke → skip or shorten outdoor exertion  
- Conflict days (good light + poor air; clear sky + rising water) → name tension in Matters; resolve toward safety in Do  
- Drought alone ≠ avoid outdoors  

---

### 5. Final timing-window rules (**D8**)

Use a practical window **only when data supports** a timing decision:

- early morning · through late morning · before noon · early afternoon · after 4 PM · near sunset · this evening  
- Exact astronomical sunrise/sunset strings allowed  
- **No** false precision ranges (e.g. 8:13–9:47, 3:00 PM–5:00 PM as Do text)

---

### 6. Scenario audit results (≥25 required cases)

Harness: `node automation/capture-dashboard-os-m2-scenarios.mjs` → **32 scenarios** written.

| # | Required case | Scenario id | Verified |
|---|---------------|-------------|----------|
| 1 | Calm ordinary day | `sunny-calm` | Walk, not photo |
| 2 | Exceptional photography morning | `excellent-photography` | Photo near sunset |
| 3 | Warm but safe afternoon | `warm-safe-afternoon` | Walk; no heat frame |
| 4 | Meaningful heat limitation | `heat-wave` | Heat Do / shade windows |
| 5 | High UV without excessive heat | `high-uv-mild` | Walk + shade counsel |
| 6 | Fog likely | `fog` | Short familiar walk |
| 7 | Fog uncertain | `fog-uncertain` | Qualitative humid/fog; verify |
| 8 | Light rain | `rain-now` | Rain-ready / dry gap |
| 9 | Heavy rain | `heavy-rain` | Wait out heaviest |
| 10 | Thunderstorm risk | `thunderstorms` | Postpone / shelter |
| 11 | Flood Watch | `flood-watch` | Precautionary crossings copy |
| 12 | Active flooding or Flood Warning | `flood-warning` | Escalated stay-clear |
| 13 | Snow | `snow-ice` | Packed paths |
| 14 | Strong wind | `high-wind` | Walk with cover / wind matter |
| 15 | Poor AQI | `poor-aqi` | Limit exertion |
| 16 | Wildfire smoke | `wildfire-smoke` | Smoke AQI constraint |
| 17 | Low-water or drought | `drought` | Still go; pack water |
| 18 | Conflicting providers | `conflicting-providers` | Uncertainty; no names |
| 19 | Stale provider data | `high-uncertainty` | Softened Do |
| 20 | Partial provider failure | `partial-provider-failure` | Continues with known domains |
| 21 | Nighttime briefing | `night-clear` | Tonight / tomorrow |
| 22 | No clearly superior opportunity | `no-superior-opportunity` | Mild walk; no photo pitch |
| 23 | Excellent general walking | `excellent-walking` | Walk primary |
| 24 | Excellent photography | `excellent-photography` | Notable photo Do |
| 25 | Safety overrides opportunity | `conflict-air-light`, `safety-overrides-photo` | Safety Do |

Artifacts: [`SCENARIOS.md`](./SCENARIOS.md) · [`scenarios.json`](./scenarios.json)

Per-scenario Spec checks (≤30-word Happening, ≤3 Matters, 1+≤1 Do, no banned voice, no provider names, no false precision): **passed** across all 32.

---

### 7. Test results

| Suite | Result |
|-------|--------|
| `node automation/test-dashboard-os-interpret.mjs` | **79 passed** (owner-decision assertions included) |
| `node automation/test-dashboard-v2.mjs` | **21 passed** |
| `node automation/test-dashboard-today-outside.mjs` | **All passed** |
| `node automation/test-dashboard-reliability.mjs` | **41 passed** |
| Scenario harness | **32 scenarios** written |

Owner assertions covered: photo not every calm day; Flood Watch precautionary; derived dew not observed; material conflict uncertainty; minor diffs quiet; timing without false precision; safety over opportunity; Spec budgets; banned promotional phrases absent.

---

### 8. Every remaining deviation

1. **Ordinary “Light softens near sunset” Matters** — On calm days without UV/heat/hazard, a low-weight light-window matter can still appear. Harmless but slightly soft vs “prefer fewer.”  
2. **Partial failure surfacing** — Partial air/water failure is reflected in trust/uncertainty reasons more than a dedicated Matters line when weather alone is live.  
3. **Do word budget vs Flood Watch phrase** — Owner-preferred Flood Watch sentence is 11 words (within ≤16). Soften prefix under high uncertainty can compress via `clipWords`.  
4. **Heat band is local product rule** — Conservative feels ≥90°F (or ≥88°F + oppressive humidity / heat alert) documented in **R2**; not a full NWS Heat Index implementation.  
5. **No multi-grid live POP differencing yet** — Material conflict still driven by flags + precip-signal heuristics until a second provider grid is wired.  
6. **Activity engine still supplies suitability** — Default Do language is walk-first, but activity suitability traces remain for evidence (D4).

None of these block M2 closeout approval; none require UI/IA change.

---

### 9. Git status (do not commit)

Working tree remains dirty with M1–M2 Outdoor OS work plus unrelated local noise (`data/*`, `status.html`, `debug.html`, importer desktop, caches).

**Closeout-touched paths (recommended commit set, when owner asks):**

- `design-system/js/dashboard/os/wds-dashboard-os-interpret.js`
- `design-system/js/dashboard/v2/wds-dashboard-v2-model.js` (dewPoint passthrough)
- `automation/test-dashboard-os-interpret.mjs`
- `automation/capture-dashboard-os-m2-scenarios.mjs`
- `docs/dashboard-os-m2-review/OWNER-REVIEW.md`
- `docs/dashboard-os-m2-review/SCENARIOS.md`
- `docs/dashboard-os-m2-review/scenarios.json`

**Not committed. Not pushed. Not deployed.**

---

### 10. Commit recommendation only

When the owner explicitly requests a commit, prefer a single focused message, e.g.:

> Close out Dashboard OS M2 intelligence per owner ranking, Flood Watch, dew-point, conflict, and timing rules.

Stage only the closeout-touched paths above (plus any already-reviewed M2 OS files if bundling the milestone). Exclude `data/*`, generated status/debug, importer desktop, and `__pycache__`.

---

## Architecture (unchanged shell)

```
OIP / V2 model
  → V2 briefing + activity + timeline
  → WDS.dashboardOSInterpret.synthesize()   ← PriorityRanker (closeout rules)
  → WDS.dashboardOSCompose.compose()
  → WDS.dashboardOSRender
```

No UI / IA / section-order redesign in this closeout.

---

## Explicit non-goals

- No Milestone 3  
- No UI / IA redesign  
- No deploy, merge, or commit  

---

## Status

**Milestone 2 closeout complete; awaiting owner approval.**
