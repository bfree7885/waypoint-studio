# Waypoint Studio Lessons Learned v1.0

> Living memory for the engineering organization.

This document captures durable discoveries from real work blocks so the next
session starts wiser than the last. It is not a changelog and not a brag
sheet. It is a shared notebook of cause → effect → prevention.

Complements:

- `docs/ENGINEERING-PLAYBOOK.md` (process lessons may also be mirrored briefly)
- `docs/PRODUCT_STANDARDS.md`
- `docs/UI_UX_PLAYBOOK.md`
- `docs/QA_PLAYBOOK.md`
- `docs/PERFORMANCE_PLAYBOOK.md`
- `docs/ACCESSIBILITY_PLAYBOOK.md`
- `docs/SECURITY_PLAYBOOK.md`
- `docs/RELEASE_PLAYBOOK.md`

When a lesson changes a standing rule, update the relevant playbook **and**
add a short entry here pointing to that update.

------------------------------------------------------------------------

# Purpose

1. Prevent repeating expensive mistakes
2. Turn local insights into organizational knowledge
3. Feed continuous improvement after every engineering work block
4. Keep Product Standards and engineering practice honest against field reality

------------------------------------------------------------------------

# Format

Use a dated entry with stable fields:

```markdown
### YYYY-MM-DD — Short title

- **Context:** App/surface and symptom
- **Category:** Architecture | UX | Performance | QA | Accessibility | Product | Security | Release
- **Lesson:** One or two sentences stating the durable rule
- **Evidence:** Commit(s), session doc, or test that proves it
- **Prevention:** What to do next time (test, checklist item, pattern sweep)
```

Keep entries skim-friendly. Prefer one sharp lesson over a narrative essay.
Link longer session reports instead of pasting them.

------------------------------------------------------------------------

# Categories

| Category | Use for |
|----------|---------|
| **Architecture** | Boot graphs, module boundaries, overlay lifecycle, coupling |
| **UX** | Honesty of states, emptiness, calm, copy, composition |
| **Performance** | Progressive paint, duplicate fetches, remounts, budgets |
| **QA** | Escaped defects, better harnesses, severity misjudgments |
| **Accessibility** | Focus, announcements, contrast, keyboard traps |
| **Product** | Trust vocabulary, privacy, education tone, ecosystem feel |
| **Security** | XSS, secrets, privacy leaks, dependency scares |
| **Release** | Rollback moments, smoke gaps, docs drift |

An entry may list a primary category and a secondary tag if needed.

------------------------------------------------------------------------

# Dating Conventions

- Use **ISO dates** (`YYYY-MM-DD`) in the local project’s working timezone for
  the work block’s completion day
- Order entries **newest first** within this file
- If a lesson is corrected later, add a new dated note rather than silently
  rewriting history—strike older advice with “Superseded by YYYY-MM-DD …”

------------------------------------------------------------------------

# How to Record Discoveries

After every meaningful work block (especially multi-hour autonomous sessions):

1. Write the owner-facing final report (Engineering Playbook)
2. Append **Lessons Learned** entries here for each durable insight
3. Patch the relevant playbook checklist or principle if the rule is standing
4. Add or extend an automated regression when the failure mode is stable
5. Do **not** commit until the owner asks

Good lessons are portable (“author `display` overrides `[hidden]`”). Weak
lessons are ticket-shaped (“fixed Pike County flicker once”).

------------------------------------------------------------------------

# Examples

### Example (good)

- **Lesson:** Progressive shell mounts must not call forecast APIs while the
  platform assembler owns that fetch.
- **Prevention:** Source assertion + network count bound in CDP smoke.

### Example (too weak)

- **Lesson:** Dashboard felt slow.
- **Prevention:** Make it faster.

------------------------------------------------------------------------

# Architectural Lessons

### 2026-07-15 — Search coverage reduces priority, never empties habitat

- **Context:** Sheds field intelligence v0.2 planner + coverage marks
- **Category:** Product (secondary: Scientific Integrity, Architecture)
- **Lesson:** Marking ground “thoroughly searched” may demote it for next-area
  planning, but product language and model factors must never imply the area
  contains no sheds. Coverage is effort memory, not detection certainty.
- **Evidence:** `apps/shed-hunting/js/sheds-search-planner.js`;
  `apps/shed-hunting/js/sheds-session-store.js`;
  `docs/SESSION-SHEDS-MAP-V0.2.md`
- **Prevention:** Planner disclaimers + explanation assertions in
  `automation/test-sheds-planner.mjs`

### 2026-07-14 — Relative search priority ≠ probability of finds

- **Context:** Sheds field map v0.1 heat surface
- **Category:** Architecture (secondary: Product, Scientific Integrity)
- **Lesson:** Field guidance layers must be labeled as relative search priority
  with explainable inputs and coverage — never as “chance of an antler here.”
  Missing land cover must read Unavailable, not invented habitat.
- **Evidence:** `apps/shed-hunting/js/sheds-likelihood-model.js`;
  `docs/SESSION-SHEDS-MAP-V0.1.md`
- **Prevention:** Product copy review + model explanation assertions in
  `automation/test-sheds-map.mjs`

### 2026-07-14 — Author `display` overrides HTML `hidden`

- **Context:** Scene Builder appeared permanently dimmed; compare mount was
  `hidden` but still painted a full-viewport scrim
- **Category:** Architecture (secondary: Accessibility, UX)
- **Lesson:** Author rules like `display: flex` beat the UA `[hidden]`
  stylesheet. Full-viewport overlays need
  `.selector[hidden] { display: none !important; }`, including mount **and**
  inner dialog elements when both exist
- **Evidence:** `bccb8d4`, `1a2d851`; `docs/SESSION-STABILIZATION-2026-07-14.md`
- **Prevention:** Pattern-sweep prompts/modals/columns; static CSS tests;
  CDP check that compare mount is `display: none` on first paint

### 2026-07-14 — Progressive mounts racing the platform assembler

- **Context:** Dashboard shell cards each tried to fetch forecasts / OIP while
  content-engine hydrated the same package
- **Category:** Architecture (secondary: Performance)
- **Lesson:** During progressive shell paint, specialty mounts should wait for
  platform readiness (`meta.hydratedAt`) unless explicitly opted into direct
  fetch
- **Evidence:** `1a2d851`; outdoor/sky/weather UI gates
- **Prevention:** Boot network bounds; code review for `getForecast` / `OIP.get`
  inside mount paths

### 2026-07-14 — Settle-before-hydrate false terminals

- **Context:** Loading cards flipped to Provider Unavailable before OIP arrived
- **Category:** Architecture (secondary: UX)
- **Lesson:** Settlement helpers must gate on package hydration, not merely on
  mount job completion of an empty progressive shell
- **Evidence:** `1a2d851`; dashboard engine settle gate
- **Prevention:** Unit/source assertions on `hydratedAt` gating

### 2026-07-14 — Duplicate shell script includes

- **Context:** Dashboard HTML loaded nav/shell modules that `wds.js` already
  includes
- **Category:** Architecture
- **Lesson:** Double-including platform shell scripts risks double-binding and
  wasted parse cost
- **Evidence:** `1a2d851`
- **Prevention:** HTML hygiene checks in stabilization tests

------------------------------------------------------------------------

# UX Lessons

### 2026-07-14 — Updating is more honest than endless Loading

- **Context:** Progressive dashboard already showed structure while modules
  refreshed
- **Category:** UX (secondary: Product)
- **Lesson:** Once a shell is visible, **Updating** better describes in-flight
  modules than language that implies the app has not started
- **Evidence:** reliability tag vocabulary in `1a2d851`
- **Prevention:** Keep trust vocabulary shared; QC/copy tests for banned
  dishonest states

### 2026-07-14 — Cold start must not invent a home place

- **Context:** Early paint needed a region without safe stored coordinates
- **Category:** UX (secondary: Product)
- **Lesson:** A national provisional shell is acceptable; inventing
  Kansas/engine publish coordinates as “you” is not
- **Evidence:** `provisionalShellLocation` in `1a2d851`; Product Standards
- **Prevention:** Block sentinel coordinates in early-start helpers; document
  in Performance + Product checklists

------------------------------------------------------------------------

# Performance Lessons

### 2026-07-14 — Second full remount erases perceived gains

- **Context:** Progressive grid appeared quickly, then OIP rewrite wiped DOM
- **Category:** Performance (secondary: UX)
- **Lesson:** Prefer in-place hydrate (briefing/banner + module refresh) after
  the package arrives
- **Evidence:** `hydrateDashboardInPlace` in `1a2d851`; CDP shell ~300ms
- **Prevention:** Stabilization tests for hydrate helper; avoid
  structure-destroying success paths

### 2026-07-14 — Trails off the critical path

- **Context:** Outdoor intelligence waited on slow Overpass trails
- **Category:** Performance
- **Lesson:** Known-slow providers belong in late enrichment with notify/merge,
  not in the critical `Promise.all` for first useful paint
- **Evidence:** `bccb8d4` / OIP schedule split
- **Prevention:** Source assertions that trails are not in the critical settle
  set

------------------------------------------------------------------------

# QA Lessons

### 2026-07-14 — Static pattern tests + short CDP beats hope

- **Context:** Overlay and progressive paint regressions are easy to reintroduce
- **Category:** QA
- **Lesson:** Pair source-level guardrails with a small headless smoke for
  display-none overlays and shell-ready timing
- **Evidence:** `automation/test-stabilization-scene-dashboard.mjs`,
  `automation/test-stabilization-cdp.mjs`
- **Prevention:** Release Playbook regression table; do not rely on manual-only
  memory for Sev-1 visual defects

------------------------------------------------------------------------

# Accessibility Lessons

### 2026-07-14 — Page-level aria-live storms

- **Context:** Dashboard root used `aria-live="polite"` across hydrate cycles
- **Category:** Accessibility
- **Lesson:** Live regions must be scoped to status fragments; announcing the
  whole progressive dashboard is hostile to screen reader users
- **Evidence:** `1a2d851` removal on `#wds-content-engine`
- **Prevention:** Accessibility checklist item on live region scope

### 2026-07-14 — Hidden overlays are AT traps too

- **Context:** Compare mount and location prompt visibility bugs
- **Category:** Accessibility (secondary: Architecture)
- **Lesson:** A scrim that ignores `hidden` blocks pointer and keyboard alike;
  treat as critical accessibility failure, not mere polish
- **Evidence:** Session stabilization reports
- **Prevention:** CDP + keyboard Escape dismiss checks

------------------------------------------------------------------------

# Product Lessons

### 2026-07-14 — Trust vocabulary is product surface

- **Context:** Tags and operational panels teach users whether to believe a card
- **Category:** Product
- **Lesson:** Shared words (Live, Updating, Partial, Cached, Offline, Provider
  Unavailable) are part of the product design system—not per-app slang
- **Evidence:** Dashboard reliability docs; Product Standards honesty rules
- **Prevention:** Centralize tag copy; forbid “Live” while pending

------------------------------------------------------------------------

# Security Lessons

_No distinct security incident recorded in the 2026-07-14 stabilization block._
Continue to treat provider strings as untrusted and keep secrets out of
commits (see Security Playbook).

------------------------------------------------------------------------

# Release Lessons

### 2026-07-14 — Exclude dirty operational noise from commits

- **Context:** Working trees often contain generated `data/*`, status/debug HTML,
  importer stubs, and local audit PDF renders
- **Category:** Release
- **Lesson:** Owner review commits should stage intentional product/docs files
  only; noise obscures risk and can publish accidental local state
- **Evidence:** Engineering Playbook dirty-tree rule; commits `1a2d851`,
  `1a1be07`, `7cab6a6`, `1160489`
- **Prevention:** Release preflight “unrelated files excluded”

------------------------------------------------------------------------

# Maintenance

- Newest entries at the top of each category section (or keep chronological
  within section—consistency matters more than perfect sort; this file uses
  dated headings and may grow either way as long as dates are clear)
- When a playbook absorbs a lesson into a standing rule, leave a one-line
  pointer here rather than deleting the story
- Archive only when an entry becomes actively misleading—and mark supersession

------------------------------------------------------------------------

# Versioning

**Lessons Learned v1.0.** Living document by design. The version tracks the
format and participation rules; the entries inside accumulate without requiring
a version bump each time.
