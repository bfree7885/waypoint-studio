# Dashboard RC3 Sprint 1 — Outdoor Intelligence Engine — Owner Review

**Status:** Awaiting owner review — **not merged · not deployed**  
**Date:** 2026-07-24  
**Sprint:** Dashboard RC3 Sprint 1 — Outdoor Intelligence Engine  
**Authority:** Product standards · Engineering playbook · Rebuild architecture (`docs/rebuild-2026/03-dashboard-architecture.md`)  
**Base:** `origin/main` @ `0be5f9fb23f0b0f024794ea2542df502416537f1` (RC2.5 Sprint 6 tip)  
**Branch:** `feature/dashboard-rc3-sprint1-intelligence`  
**Final commit SHA:** `8f14cb86a5807ea4dd7b7c4662c93ee665c30361`  
**Deployment status:** **Not deployed**

---

## Verdict

Rebuild Home’s **Today Outside** panel is now the flagship Outdoor Intelligence surface: plain-language day summary, Outdoor Score, activity guide, practical time windows, Waypoint’s Take, and an expandable Explain why panel — all derived deterministically from OIP platform data. No duplicate competing section; Workspace / Customize / prefs / mobile tile editing / Phase 2 visual lock are preserved.

**Recommendation:** Review on feature branch; merge when satisfied. Do not deploy until owner gate.

---

## Mission answered

| Morning question | Surface |
|------------------|---------|
| Should I go outside? | Outdoor Score + Waypoint’s Take |
| What should I do? | Activity guide (Excellent → Poor) |
| When? | Best time windows (practical bands) |
| Why trust this? | Explain why + High / Moderate / Limited confidence |

---

## What shipped (user-visible)

1. **Today Outside (evolved)** — Same section near the top; summary bullets now include Outdoor Score and interpretive cues (UV, alerts, hiking window, photo/sky) when data exists.
2. **Outdoor Score (n/100)** — Weighted from temperature, precip, wind, humidity, clouds, UV, AQI, alerts, rivers (when present). Missing factors are dropped and weights renormalized — never invented.
3. **Activity guide** — Photography, Birding, Wildlife, Hiking, Trail Running, Fishing (requires gauge), Gardening, Camping, Astronomy, General Outdoor Time — each with level, short explanation, confidence.
4. **Best time windows** — Hiking, Photography, Wildlife, Stargazing as practical bands (`early morning`, `near sunset`, …). No minute-level fake precision; Limited confidence when hourly data is thin.
5. **Waypoint’s Take** — Brief editorial guide voice (no AI buzzwords, no urgency hacks).
6. **Explain why** — Native `<details>` / `<summary>`: contributing factors, base weights, missing inputs, confidence.

---

## Outdoor Score algorithm

Base weights (sum = 100 when all factors present):

| Factor | Weight | Role |
|--------|-------:|------|
| temperature | 18 | Comfort band from feels-like / temp |
| precipitation | 16 | POP + storm language |
| wind | 10 | Light → very strong |
| humidity | 6 | Comfort / muggy |
| clouds | 6 | Mild preference for mixed cover |
| uv | 10 | Exposure midday |
| aqi | 14 | Breathing / exertion |
| alerts | 12 | Official hazard priority (known empty feed scores high) |
| rivers | 8 | Only when gauge sites present |

**Rules**

- Each present factor scores 0–100 with a short note.
- Final score = Σ(factorScore × weight) / Σ(present weights), rounded.
- Confidence: **High** when ≥6 factors + live weather; **Moderate** when thinner / cached / missing AQI; **Limited** when <4 factors or no live weather.
- Alerts object present with zero items → alerts factor can score “no active alerts.” Absent alerts object → factor omitted (not invented).

---

## Architecture one-liner

`OIP platform → WDS.dashboardRebuildIntelligence.generate() (pure) → Today Outside render` — non-blocking on hydrate; no Outdoor OS chrome revival.

| Module | Role |
|--------|------|
| `wds-dashboard-rebuild-intelligence.js` | Score, activities, windows, take, explanation (testable pure API) |
| `wds-dashboard-rebuild-today.js` | Flagship UI inside existing Today Outside |
| `wds-dashboard-rebuild-data.js` | Attaches `today.intelligence` when generating pack |
| `wds-dashboard-rebuild.css` | Compact intel layout; tablet/phone stack; reduced-motion |
| `wds.js` | Loads intelligence before today |

Patterns borrowed (not chrome): Outdoor OS interpret practical bands; V2 activity suitability ideas; outdoor-weather-intel comfort heuristics.

---

## Files changed

### New

| Path | Role |
|------|------|
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intelligence.js` | Engine |
| `automation/test-dashboard-rebuild-intelligence.mjs` | Contracts |
| `docs/rebuild-2026/dashboard-rc3-sprint1-owner-review.md` | This review |
| `docs/rebuild-2026/dashboard-rc3-sprint1/` | Screenshot dir (if captured) |

### Updated

| Path | Change |
|------|--------|
| `wds-dashboard-rebuild-today.js` | Intelligence surface |
| `wds-dashboard-rebuild-data.js` | Prefer intelligence lines |
| `wds-dashboard-rebuild.js` | Version `4.0.0-rc3-s1-intelligence` |
| `wds-dashboard-rebuild.css` | Intel styles + responsive |
| `design-system/js/wds.js` | Load order |
| `apps/dashboard/index.html` | Cache-bust `dash-rc3-s1` |
| `automation/test-dashboard-rebuild-phase2.mjs` | Intelligence regressions |
| `docs/ENGINEERING-PLAYBOOK.md` | Lessons learned |

---

## Screenshots

Directory: [`docs/rebuild-2026/dashboard-rc3-sprint1/`](./dashboard-rc3-sprint1/)

| Viewport | File |
|----------|------|
| Desktop workspace (fixture hydrate) | [01-desktop-workspace.png](./dashboard-rc3-sprint1/01-desktop-workspace.png) |
| Phone workspace (fixture hydrate) | [02-phone-workspace.png](./dashboard-rc3-sprint1/02-phone-workspace.png) |

Capture: `node automation/capture-dashboard-rc3-sprint1.mjs` (fixture platform — no live weather required). Meta: `capture-meta.json` (score/take/10 activities confirmed).

---

## Tests

```bash
node automation/test-dashboard-rebuild-intelligence.mjs   # 79 passed, 0 failed
node automation/test-dashboard-rebuild-phase2.mjs         # 101 passed, 0 failed
node automation/test-dashboard-rebuild-phase1.mjs         # 88 passed, 0 failed
```

**Totals this block:** 79 + 101 + 88 = **268 passed**.

Coverage: Today Outside generation, Outdoor Score weights/redistribution, activity levels + fishing gauge gate, practical windows, confidence labels, Explain why markup, calm voice bans, missing-data honesty, responsive CSS hooks, shell/customize preservation, determinism.

---

## Accessibility

- Semantic `h2` / `h3` / `h4` hierarchy inside Today Outside
- Score value has SR-only “out of 100”
- Explain why uses native `<details>` / `<summary>` (keyboard)
- Confidence exposed as text, not color alone (pills + labels)
- `prefers-reduced-motion` disables explain chevron transition
- Touch-friendly summary min-height

---

## Performance

- Intelligence is synchronous pure computation on already-hydrated platform (no extra network)
- Shell still mounts immediately; OIP hydrate remains non-blocking
- No new provider calls from the intelligence module

---

## Risks / follow-ups

1. **Fishing** stays Limited until Rebuild rivers widget / OIP river slice is live for the place.
2. **Hourly windows** quality depends on `weatherRef.hourly` length; otherwise fallback bands + Limited/Moderate confidence.
3. **Legacy** `test-dashboard-today-outside.mjs` still asserts Outdoor OS chrome (pre-existing main baseline) — not fixed in this sprint (documented RC2 follow-up).
4. Visual capture screenshots optional for owner preference before merge.

---

## Product standards check

| Standard | Status |
|----------|--------|
| Never fabricate data | Pass — null factors omitted |
| Honest loading / confidence | Pass |
| Observational / educational tone | Pass — bans hype / homework |
| No redesign of Home layout philosophy | Pass — evolved Today Outside only |
| No deploy without owner | Pass — feature branch only |

---

## Git / deployment

| Item | Value |
|------|-------|
| Branch | `feature/dashboard-rc3-sprint1-intelligence` |
| Base | `origin/main` @ `0be5f9f` |
| Final commit SHA | `8f14cb86a5807ea4dd7b7c4662c93ee665c30361` |
| Merged to main? | **No** |
| Deployed? | **Not deployed** |

---

## Owner decision

- [ ] Approve for merge
- [ ] Approve with follow-ups
- [ ] Request changes
