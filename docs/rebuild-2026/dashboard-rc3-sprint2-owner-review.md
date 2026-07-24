# Dashboard RC3 Sprint 2 — Outdoor Intelligence Refinement — Owner Review

**Status:** Awaiting owner review — **not merged · not deployed**  
**Date:** 2026-07-24  
**Sprint:** Dashboard RC3 Sprint 2 — Outdoor Intelligence Refinement  
**Authority:** Product standards · Engineering playbook · Rebuild architecture · Sprint 1 owner review  
**Base:** `feature/dashboard-rc3-sprint1-intelligence` @ `9f21540` (RC3 Sprint 1 tip)  
**Branch:** `feature/dashboard-rc3-sprint2-refinement`  
**Final commit SHA:** `e155991d0554b0a5c41adec14c03ab25e8154170` (feature tip; docs pin may follow)  
**Deployment status:** **Not deployed**

---

## Verdict

Outdoor Intelligence moves from **correct** to **trustworthy, intuitive, and enjoyable**: calibrated score bands, field-guide activity sentences, activity cards with icons + best windows, clock ranges only when hourly data supports them, clearer confidence reasons, and a calmer Explain why panel — still one Today Outside section, still hydrated OIP only, still no redesign of Home hierarchy.

**Recommendation:** Review on feature branch; merge when satisfied. Do not deploy until owner gate.

---

## Mission answered

| Goal | Result |
|------|--------|
| Calibrated Outdoor Score | New bands; factor curves tightened so Exceptional is rare |
| Natural recommendations | Field-guide sentences (not “Hiking: Good”) |
| Activity cards | Icon · name · quality · confidence · best window · explanation |
| Best time windows | Clock ranges when hourly reliable; titled bands otherwise |
| Waypoint’s Take | Short naturalist voice; length-capped |
| Explain why | Factors + educational cues + confidence reasons |
| Confidence | Completeness, hourly coverage, freshness, cache, alerts |
| Perf / a11y | Brief reused from pack; hierarchy / SR / reduced-motion retained |

---

## What shipped (user-visible)

1. **Outdoor Score bands** — Exceptional (95–100) · Excellent (85–94) · Good (70–84) · Mixed (55–69) · Challenging (&lt;55).
2. **Activity guide** — Compact cards with decorative icon mark, quality pill, best-time line + confidence, field-guide explanation.
3. **Best time windows** — `7:15–9:30 AM`-style ranges when ≥6 hourly rows; otherwise **Early Morning** / **Near Sunset** / etc. Confidence + precision label on each.
4. **Waypoint’s Take** — Observational, short, no hype; reuses top activity explanation when helpful.
5. **Explain why** — Why confidence is X · contributing factors (human labels) · “What the instruments suggest” (humidity, clouds, wind, UV, rivers) · missing inputs · base weights.
6. **Visual polish only** — Spacing, icon alignment, band title casing, new level pill colors — no layout redesign.

---

## Outdoor Score calibration (every adjustment)

**Weights unchanged** (sum 100): temperature 18 · precipitation 16 · wind 10 · humidity 6 · clouds 6 · UV 10 · AQI 14 · alerts 12 · rivers 8.

### Factor curve adjustments (Sprint 1 → Sprint 2)

| Factor | Sprint 1 peak / mid | Sprint 2 change | Why |
|--------|---------------------|-----------------|-----|
| Temperature | 55–72 → 96 | **58–68 → 100** (true sweet spot); **55–72 → 88**; mid bands lowered ~4–8 pts | Reserve Exceptional for narrow comfort; pleasant days stay Excellent |
| Precipitation | &lt;15 → 95 | **&lt;8 → 100**; **&lt;15 → 88**; mid bands −3 to −6 | Avoid scoring “15% chance” like clear-dry |
| Wind | &lt;8 → 94 | **&lt;5 → 98**; **&lt;8 → 88**; breeze bands lowered | Distinguish calm vs merely light |
| Humidity | 35–65 → 92 | **40–60 → 96**; **35–65 → 86**; muggy lowered | Tighter comfort core |
| Clouds | 25–70 → 88 | **30–60 → 92**; **25–70 → 82**; clear/heavy slightly lower | Mixed light preferred without inflation |
| UV | &lt;3 → 90; &lt;6 → 78 | **&lt;3 → 95**; **&lt;6 → 74**; high UV slightly harsher | Moderate UV is common — should not inflate toward Exceptional |
| AQI | ≤50 → 95 | **≤40 → 98**; **≤50 → 90**; moderate → 68 | Clean air vs merely “Good” EPA band |
| Alerts (none) | 96 | **98** | Keep no-alert signal strong without carrying a mediocre day alone |
| Alerts (active) | 28 / 12 | **26 / 10** | Slightly stronger penalty |
| Rivers stable | 82 | **88** | Reward known manageable gauge without inventing safety |

### Soft ceilings (anti-inflation)

- Active alerts → overall score capped at **84** (cannot read Excellent/Exceptional while alerts are primary).
- Weakest factor &lt; 40 and composite would be ≥95 → cap **94**.
- Fewer than 5 factors and composite would be ≥95 → cap **94**.

### Calibration fixtures (deterministic)

| Scenario | Approx score | Band |
|----------|-------------:|------|
| Pleasant (68°F, 15% POP, light wind, AQI 38, no alerts) | ~90 | Excellent |
| Ideal (62°F, 5% POP, 4 mph, AQI 28, stable river, low UV) | ~97 | Exceptional |
| Storm + alert + wind + humidity | ~47 | Challenging |

No arbitrary “+5 to feel nicer” bumps. Missing factors still redistribute weights; never invented.

---

## Confidence model (Sprint 2)

Signals that raise/lower confidence:

- Factor completeness (of 9)
- Hourly row count (≥12 high / ≥6 moderate / thin / none)
- Live vs cache
- Observation age (&gt;6h penalty; ≤2h bonus when known)
- Active alerts
- Missing key inputs (aqi, precipitation, temperature, uv)

Labels remain **High / Moderate / Limited**. Reasons are listed in Explain why (“Why confidence is …”).

---

## Best time windows

| Coverage | Precision | Example | Confidence |
|----------|-----------|---------|------------|
| ≥6 hourly rows, contiguous peak | `range` | `9–11 AM` | Moderate–High |
| &lt;6 / no hourly | `band` | `Early Morning`, `Near Sunset` | Limited–Moderate |

No minute-level appointment language when data is thin. Activity cards inherit mapped windows (hiking←trail running/gardening/etc., wildlife←birding, stargazing←astronomy).

---

## Architecture one-liner

`OIP platform → fromPlatform(+now) → intelligence.generate once → Today Outside reuses brief` — no second generate on render; no new APIs.

| Module | Role |
|--------|------|
| `wds-dashboard-rebuild-intelligence.js` | v1.1.0-rc3-s2 engine |
| `wds-dashboard-rebuild-today.js` | Cards, Explain why, brief reuse |
| `wds-dashboard-rebuild-data.js` | `fromPlatform(..., { now })` |
| `wds-dashboard-rebuild.js` | Passes `intelligence` into today context |
| `wds-dashboard-rebuild.css` | Level pills, icons, spacing |
| `apps/dashboard/index.html` | Cache-bust `dash-rc3-s2` |

---

## Files changed

### Updated

| Path | Change |
|------|--------|
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intelligence.js` | Calibration, bands, windows, Take, confidence, educational explain |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js` | Activity cards + Explain why + brief reuse |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js` | Pass `now` into generate |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js` | Version + intelligence in today context |
| `design-system/css/wds-dashboard-rebuild.css` | Exceptional/Mixed/Challenging, icons, spacing |
| `apps/dashboard/index.html` | `dash-rc3-s2` cache-bust |
| `automation/test-dashboard-rebuild-intelligence.mjs` | Expanded Sprint 2 contracts |
| `docs/ENGINEERING-PLAYBOOK.md` | Lessons learned |
| `docs/rebuild-2026/dashboard-rc3-sprint2-owner-review.md` | This review |

### Screenshot dir

`docs/rebuild-2026/dashboard-rc3-sprint2/` — optional captures; not required for merge gate.

---

## Tests

```bash
node automation/test-dashboard-rebuild-intelligence.mjs   # 114 passed, 0 failed
node automation/test-dashboard-rebuild-phase2.mjs         # 101 passed, 0 failed
node automation/test-dashboard-rebuild-phase1.mjs         # 88 passed, 0 failed
```

**Totals this block:** 114 + 101 + 88 = **303 passed**.

Coverage added/expanded: score bands + calibration fixtures, confidence reasons, hourly range vs band fallback, Take tone/length, Explain why educational + confidence sections, activity icons/windows, brief reuse without platform, heat→Early Morning, storm/alert ceiling, missing-data honesty, responsive CSS hooks, shell/customize preservation, determinism.

---

## Accessibility

- Semantic `h2` / `h3` / `h4` hierarchy retained
- Score SR-only “out of 100”; activity windows have SR “Best time:”
- Icons `aria-hidden="true"` (name remains in text)
- Explain why native `<details>` / `<summary>` (keyboard)
- Confidence as text, not color alone
- `prefers-reduced-motion` on explain chevron
- Touch-friendly summary min-height retained

---

## Performance

- One `generate()` per `fromPlatform` hydrate; Today Outside reuses `ctx.intelligence`
- Synchronous pure computation on hydrated platform — **no new network / API requests**
- Shell still mounts immediately; OIP hydrate remains non-blocking

---

## Risks / follow-ups

1. **Fishing** still Limited without river gauge in package.
2. Clock ranges depend on `weatherRef.hourly` quality/timezone parsing from provider timestamps.
3. Decorative icon marks are typographic, not a full icon set — fine for compact cards; can swap to WDS icons later without API change.
4. Legacy `test-dashboard-today-outside.mjs` Outdoor OS asserts remain a disclosed main baseline (not this sprint).

---

## Product standards check

| Standard | Status |
|----------|--------|
| Never fabricate data | Pass |
| Honest confidence / loading | Pass — reasons explained |
| Observational / educational tone | Pass — field-guide + bans |
| No Home redesign | Pass — Today Outside only |
| No deploy without owner | Pass — feature branch only |

---

## Git / deployment

| Item | Value |
|------|-------|
| Branch | `feature/dashboard-rc3-sprint2-refinement` |
| Base | Sprint 1 tip `9f21540` |
| Final commit SHA | `e155991d0554b0a5c41adec14c03ab25e8154170` (feature; docs pin follows) |
| Merged to main? | **No** |
| Deployed? | **Not deployed** |

---

## Owner decision

- [ ] Approve for merge
- [ ] Approve with follow-ups
- [ ] Request changes
