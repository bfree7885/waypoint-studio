# Waypoint Studio Engineering Playbook v1.0

Canonical session operating model for agents and humans. A concise Cursor rule
mirrors the hard gates in `.cursor/rules/engineering-playbook.mdc`.

Product philosophy (trust, privacy, education, AI honesty) lives in
`docs/PRODUCT_STANDARDS.md` and `.cursor/rules/product-standards.mdc`.
Dashboard product soul (Outdoor OS briefing, not weather/widgets):
`docs/DASHBOARD-PRODUCT-MANIFESTO.md`.
Dashboard exact screen blueprint (build from this; no code in the doc):
`docs/DASHBOARD-SCREEN-SPECIFICATION.md`.
Dashboard Outdoor OS Milestone 1 owner review:
`docs/DASHBOARD-OS-MILESTONE1-OWNER-REVIEW.md`.
Dashboard Outdoor OS implementation Owner Review (current):
`docs/DASHBOARD-OS-OWNER-REVIEW.md`.

---

## Mission

Every engineering session should leave the codebase more reliable, easier to
maintain, faster, more accessible, better documented, and better tested.

## Core Principles

- Privacy first.
- Local-first whenever practical.
- Honest loading states.
- Never fabricate data.
- Progressive enhancement.
- Mobile-first responsive design.
- Accessibility by default.
- Shared design system.
- Simplicity over cleverness.
- Leave the codebase better than you found it.

## Workflow

1. Understand the objective.
2. Investigate the existing implementation.
3. Identify root causes.
4. Implement the smallest correct fix.
5. Improve architecture when justified.
6. Add/update tests.
7. Review UX.
8. Review accessibility.
9. Review performance.
10. Search for similar defects.
11. Update documentation.
12. Produce a final report.

## Engineering Roles

Operate through these perspectives in each work block:

- Senior Engineer
- UX Engineer
- Performance Engineer
- Accessibility Engineer
- QA Engineer
- Reliability Engineer
- Security Reviewer
- Documentation Reviewer

## Quality Gates

- Root cause identified.
- Regression prevented.
- Tests pass.
- No new console errors.
- Desktop and mobile verified.
- Accessibility reviewed.
- Performance reviewed.
- Documentation updated.

## Architecture Standards

Prefer modular code, progressive rendering, independent components, graceful
degradation, and reusable utilities. Avoid duplicate logic, blocking
initialization, monolithic files, and hidden coupling.

## UX Standards

Render immediately. Use honest loading states. Avoid layout shifts. Fail
gracefully. Never appear frozen.

## Accessibility Standards

Review keyboard navigation, focus, ARIA, reduced motion, contrast, touch
targets, and screen readers.

## Performance Standards

Review startup, duplicate requests, rerenders, layout shifts, bundle impact,
blocking JavaScript, and caching.

## QA Standards

Test desktop, mobile, refresh, navigation, slow network, offline, empty data,
partial data, provider failures, and rapid interaction.

## Reliability Standards

When one defect is found, inspect the rest of the codebase for the same
architectural pattern and add regression tests when appropriate.

## Documentation

Document objectives, root causes, files changed, tests added, remaining
limitations, and recommendations.

## Commit Rules

- Never commit automatically.
- Never push automatically.
- Always wait for owner review.

Leave unrelated dirty tree noise alone (`data/*`, generated status/debug pages,
importer desktop stubs, local audit PDF renders) unless the owner asks to
include them.

## Final Report

Include:

- Objective
- Root causes
- Improvements
- Tests
- Remaining risks
- Recommendations
- Session start/end if observable
- Runtime if measurable; otherwise explicitly state unavailable

---

## Lessons Learned

Append new engineering lessons after every work block so the playbook
continuously improves.

### 2026-07-22 — Outdoor OS M3 reconciliation onto RC3 origin/main

**Artifact:** `docs/dashboard-os-m3-reconcile/OWNER-REVIEW.md`  
**Branches:** `backup/dashboard-os-m3-pre-reconcile`, `recovery/dashboard-os-m3-reconcile`,
`integration/dashboard-os-m3`

1. **Cherry-pick OS onto origin/main, never rewrite production tip first.**
   Preserve Pages/nav/Scenes infra; resolve Dashboard entry to Outdoor OS.
2. **modify/delete on legacy render ≠ automatic delete.** Keeping
   `wds-dashboard-v2-render.js` for V2/V3/kiosk while engine prefers OS is valid;
   update tests to assert product path, not file absence.
3. **Quiet chrome must merge with Explore, not replace it.** Outside uses
   `data-quiet-chrome`; other apps keep RC3 primary nav + Explore.
4. **Test count rises when RC3 modular suites are retained** (V2 ~21 → 58) —
   document, don’t “fix” by deleting coverage.

### 2026-07-22 — Outdoor OS Milestone 3 (professional polish + production verify)

**Artifact:** `docs/dashboard-os-m3-review/OWNER-REVIEW.md`  
**Harness:** `automation/capture-dashboard-os-m3-screenshots.mjs`,  
`automation/capture-dashboard-os-m3-production-compare.mjs`

1. **Production status ≠ git status.** Live `meta[name=waypoint-build]` +
   `data/build-info.json` + Pages workflow SHA are the source of truth; local
   HEAD can be ahead/behind/diverged without production knowing.
2. **`:focus-visible` won’t show in CDP `.focus()` screenshots.** Keyboard Tab
   is the real a11y proof; document the headless limitation instead of chasing
   rings that never paint under programmatic focus.
3. **Timeline `timeLabel` falling back to `detail` glues prose into Day Arc
   clocks** (“Diffuse light” → `diffuselight`). Compact only labels that look
   like clocks; never strip spaces from arbitrary strings.
4. **Panel craft is mostly host state + focus restore**, not new IA — backdrop,
   trap, inert sheet, restore opener, reduced-motion instant path.
5. **GitHub Pages can succeed while CI fails** by design in this repo — do not
   treat CI green as a deploy prerequisite when reporting production SHA.

### 2026-07-22 — Outdoor OS Milestone 2 closeout (owner decisions)

**Artifact:** `docs/dashboard-os-m2-review/OWNER-REVIEW.md`  
**Harness:** `automation/capture-dashboard-os-m2-scenarios.mjs` (32 fixtures)  
**Tests:** `automation/test-dashboard-os-interpret.mjs` (79)

1. **“Good photo” ≠ Do photography.** Without an activity-preference UI, ordinary
   calm days must default to a general outdoor walk; photography only when
   excellent/notable light advantage is evidenced (R1/D6).
2. **Flood Watch ≠ Flood Warning.** Precautionary crossings language for Watch;
   escalate only for Warning / active flooding — never “stay home” by default.
3. **Derived dew point must never read as observed.** Prefer provider dew; else
   calculate only from fresh temp+RH; mark derived; qualitative copy; skip stale.
4. **Material vs minor provider conflict.** Material → uncertainty in triad
   without provider names; minor → silence. Sources owns identity.
5. **Practical timing windows beat clock precision.** Map activity hours to
   bands (early morning … near sunset); exact sunrise/sunset OK; ban 8:13–9:47.
6. **Drought alone is not an avoid-outdoors signal.** Combine with heat/fire/UV
   only when those signals exist; still recommend going out with water.

### 2026-07-22 — Outdoor OS Milestone 2 (Waypoint Intelligence)

**Artifact:** `docs/dashboard-os-m2-review/OWNER-REVIEW.md`  
**Harness:** `automation/capture-dashboard-os-m2-scenarios.mjs` (22 fixtures → 32 at closeout)

1. **Interpretation belongs in a PriorityRanker module, not compose string pasting.**
   Compose keeps place/trust/day-arc; `dashboardOSInterpret` owns Happening /
   Matters / Do with traces. UI unchanged.
2. **`/rise/` does not match `"rising"`.** Trend matchers need `ris(e|ing)` (or
   similar) — substring intuition fails on morphology.
3. **Trajectory “clearing” support must lose to hazards.** Otherwise snow/wind/
   conflict days get “clouds thin later” nonsense. Gate clearing on low signal
   weight.
4. **Photo opportunity must not pad Matters under rain/storm/fog** — suppress
   light signals when hazard owns the day; keep photo only for air+light
   *conflict* naming.
5. **Activity hourly windows can recommend 9pm walks.** Prefer daylight golden
   hour for photography Do; clamp late-PM activity windows toward late
   afternoon / golden → superseded by practical bands in closeout (D8).
6. **Scenario harness > manual copy review.** Fixture → interpret → JSON/MD
   makes ranking regressions obvious and reproducible for owner review.

### 2026-07-22 — Outdoor OS Milestone 1.5 (readability / hierarchy / presence)

**Artifact:** `docs/dashboard-os-m1.5-review/OWNER-REVIEW.md`  
**Scope:** CSS + minimal scan copy only; IA/interaction locked.

1. **Capture before screenshots before touching CSS.** Night vs day atmosphere
   changes the review story — note capture TOD when comparing before/after.
2. **Hierarchy is mostly weight, measure, and gap — not new chrome.** A 2px
   Do accent rail beats a CTA pill; quieter Sources/gateways beat more labels.
3. **Shell background can box the briefing.** When Outside sets night
   atmosphere, quiet shell/body must follow (`:has([data-wdb-os-atmosphere])`)
   or the screen reads as a dark card on a light page.
4. **Compact day-arc times in compose** (`2p` vs `2:00 PM`) is scanability,
   not IA — keep Spec §1.3 [H] beat format in the composer, not CSS.

### 2026-07-21 — Outdoor OS Dashboard architecture reset (docs only)

**Artifact:** `docs/OUTDOOR-OS-DASHBOARD-RESET.md`  
**No implementation** in this block.

1. **Layering briefing UI on a widget/tab IA does not yield an Outdoor OS.**
   Recovery tabs + V2 overview panels still communicate “instrument console.”
   Preserve OIP/providers/rule engines; treat grid/tab chrome as disposable.
2. **Playbook concessions that legitimize multi-widget-after-briefing** encode
   the failed product compromise — revise when rebuilding presentation.
3. **Success metric shift:** first viewport must answer happening → matters →
   do; “widgets live” is infrastructure health, not product success.

### 2026-07-14 — Scene Builder dimming & dashboard progressive hydrate

**Commits:** `bccb8d4`, `1a2d851`  
**Session report:** `docs/SESSION-STABILIZATION-2026-07-14.md`

1. **`display:` author rules beat UA `[hidden]`.** Any full-viewport overlay
   with `display: flex|grid|block` needs an explicit
   `.selector[hidden] { display: none !important; }`. After fixing one surface,
   sweep siblings (compare mount, location prompt mount + inner dialog, modal,
   columns gated only inside a media query).
2. **Progressive shell must not refetch.** Widget mounts that call
   `getForecast` / `OIP.get` during first paint race the content engine, bump
   generations, and waste Open-Meteo quota. Shell mounts should wait for
   `platform.meta.hydratedAt` (or an explicit `allowDirectFetch` opt-in).
3. **Second `innerHTML` wipe destroys perceived performance.** Prefer
   in-place hydrate (briefing/banner + `refreshDashboard`) after OIP arrives.
4. **Do not settle Loading → Unavailable before hydrate.** Gate
   `settleStaleMounts` on package readiness so progressive cards are not
   falsely terminal.
5. **Cold start needs a non-lying location.** National provisional shell is
   fine; inventing Kansas/engine publish coordinates is not.
6. **Page-level `aria-live` on the whole dashboard** announces hydrate storms —
   keep live regions on status fragments, not the content root.
7. **Duplicate script includes** (nav/shell already pulled by `wds.js`) risk
   double-binding; load platform modules once.
8. **Regression insurance:** static pattern tests plus a short CDP smoke for
   overlay coverage and shell-ready timing beat reliance on manual repro alone.
