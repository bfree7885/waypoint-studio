# Waypoint Studio QA Playbook v1.0

> Quality assurance standards for every Waypoint Studio application.

This handbook defines how teams verify that software is trustworthy, calm,
accessible, and ready for people exploring the outdoors and their creative
work.

It complements:

- `docs/ENGINEERING-PLAYBOOK.md` — process and quality gates
- `docs/PRODUCT_STANDARDS.md` — trust, privacy, honesty
- `docs/UI_UX_PLAYBOOK.md` — interface behavior and review checklist
- `docs/PERFORMANCE_PLAYBOOK.md` — speed and progressive behavior
- `docs/ACCESSIBILITY_PLAYBOOK.md` — inclusive verification depth
- `docs/SECURITY_PLAYBOOK.md` — privacy and safety verification
- `docs/RELEASE_PLAYBOOK.md` — ship gates and smoke expectations
- `docs/LESSONS_LEARNED.md` — discoveries that tighten future QA

------------------------------------------------------------------------

# Mission

QA exists to protect trust.

A release that looks finished but mislabels estimates as Live, dims a page
behind a dead overlay, or fails silently offline is not “mostly fine.” It is a
product failure. Quality assurance makes those failures hard to ship.

------------------------------------------------------------------------

# Testing Philosophy

## Principles

1. **Honesty over coverage theater.** Prefer fewer tests that catch real
   trust and regression risk over large suites that assert trivia.
2. **User journeys first.** Location → shell → primary task → recovery from
   failure matters more than isolated unit purity alone.
3. **States are features.** Loading, empty, offline, partial, cached, and
   error paths are first-class—not “sad paths” deferred until later.
4. **Automate the boring, explore the risky.** Automation guards known
   defects; structured exploratory QA finds new ones.
5. **Same defect class, same hunt.** When one bug appears, search for its
   architectural twins (see Engineering Playbook reliability standards).
6. **Never fabricate data to make tests green.** Fixtures must be labeled as
   fixtures; product UI under test must not invent Live conditions.

## What “done” means for QA

A change is QA-complete when:

- Intended behavior works on representative desktop and mobile widths
- Relevant automated tests pass
- Loading / empty / error honesty still holds
- No new console errors on the primary happy path
- Accessibility smoke (keyboard + focus + obvious contrast) has been considered
- Residual risk is written down, not ignored

------------------------------------------------------------------------

# Functional Testing

Verify that each product still fulfills its purpose.

## Core journey questions

- Can the user establish or change location without confusion?
- Does the primary surface render and become usable quickly?
- Do actions that mutate local state persist across refresh when they should?
- Do provider-backed modules eventually reach a **terminal** state (Live,
  Partial, Cached, Offline, Provider Unavailable, Error)—never endless
  Updating with no explanation?
- Do mode switches (for example Scene Builder product modes) dismiss overlays
  and restore an interactive UI?

## Functional coverage by layer

| Layer | Examples |
|-------|----------|
| Shell | Global nav, local nav, launcher, skip link |
| Location | Bootstrap, prompt, stored location, manual search |
| Content | Region bundles render; widgets mount independently |
| Tools | Photo Coach compare/close; uploads; editors |
| Settings | Customize dashboard; preferences survive reload |

## Functional anti-patterns to catch

- Buttons that do nothing on second click
- Double-initialized nav or duplicate event handlers
- “Success” UI with empty or fabricated bodies
- Dialogs that cannot be dismissed with Escape or backdrop rules

------------------------------------------------------------------------

# Regression Testing

Regression is unpaid debt from yesterday’s fix.

## When to add a regression test

- A user-visible defect escaped once
- A pattern is easy to reintroduce (`[hidden]` vs `display`, progressive mounts
  that refetch, settle-before-hydrate)
- A trust vocabulary change (tag labels, empty copy)

## Preferred regression styles in this repo

| Style | Good for |
|-------|----------|
| Static / source assertions | Guarding structural patterns without flaky network |
| Module sandbox tests | Reliability helpers, tag vocabulary, pure transforms |
| CDP / headless browser smoke | Overlay visibility, shell-ready timing, seeded location |
| Manual exploratory | Fine visual judgment, device-specific gesture quirks |

Name tests after the risk they prevent, not the file they happen to touch.

------------------------------------------------------------------------

# Mobile Testing

Mobile is a primary Waypoint surface, not a shrink-wrap afterthought.

## Required checks

- Primary journeys on a narrow viewport (phone width)
- Touch targets remain comfortable; no hover-only essentials
- Sticky chrome does not permanently obscure primary content
- Orientation change does not clip critical controls
- Soft keyboards do not trap essential form actions when practical to verify

## Mobile-specific failures

- Horizontal overflow that forces page-wide sideways scroll
- Tap targets stacked closer than thumb accuracy allows
- Full-screen overlays that dismiss incorrectly or leave a dimming scrim
- Local nav that becomes unusable when collapsed

Document device or emulation used when filing mobile bugs.

------------------------------------------------------------------------

# Cross-Browser Testing

Waypoint Studio targets modern evergreen browsers.

## Baseline matrix (practical)

| Browser engine | Priority |
|----------------|----------|
| Chromium (Chrome / Edge) | Primary automation + daily development |
| WebKit (Safari / iOS) | High—field users and photographers |
| Firefox | Important for layout and privacy-sensitive users |

## What to verify cross-browser

- App shell sticky behavior and z-index / overlay stacking
- Geolocation and permission prompt wording differences (document, do not
  “fix” away)
- `localStorage` / session persistence assumptions
- Focus rings and `:focus-visible` behavior
- Date/time and Intl formatting in briefing surfaces

Do not block a release on an obsolete browser unless the product explicitly
supports it.

------------------------------------------------------------------------

# Offline Testing

Offline honesty is a Product Standards requirement.

## Scenarios

1. Load while online, then go offline mid-session
2. Cold start while offline with prior cache
3. Cold start while offline with no cache
4. Provider timeouts that mimic offline softness while `navigator.onLine` is true

## Expectations

- UI labels Offline or Cached when appropriate—never Live for stale inventions
- Offline empty states explain reconnect or available cache
- Retry does not pretend success without network
- No silent failure that leaves a forever spinner

------------------------------------------------------------------------

# Slow-Network Testing

Slow networks expose blocking initialization better than fast office Wi‑Fi.

## Techniques

- Browser network throttling (Slow 3G / custom)
- Delayed provider responses (where test harnesses exist)
- Large region or trail requests under latency

## Expectations

- Shell and navigation appear without waiting for every provider
- Modules show Updating / waiting copy while work continues
- A slow provider must not block unrelated modules forever
- User can still navigate away; the UI never feels frozen

Record approximate timings when performance-related bugs are filed (see
Performance Playbook).

------------------------------------------------------------------------

# Accessibility Verification

Depth lives in `docs/ACCESSIBILITY_PLAYBOOK.md`. QA’s minimum bar:

- Keyboard-only pass over the changed surface
- Focus visible; Escape closes new overlays; focus returns on close
- Images and icon buttons have accessible names where needed
- Status text exists for color-coded tags
- No new obvious contrast regressions on primary text

Escalate full WCAG audit items to accessibility review rather than waving them
through as “looks fine.”

------------------------------------------------------------------------

# Smoke Testing

Smoke tests answer: “Is the build basically alive?”

## Platform smoke (every meaningful release candidate)

1. Open Dashboard — shell appears; location path workable
2. Open Scenes / Scene Builder — UI interactive; no permanent dimming
3. Open one secondary app (Photo Coach, ForageCast, or Library)
4. Launcher navigates between apps without breaking shell
5. Refresh each checked app once

## Hard fail smoke signals

- Blank main region beyond a brief honest skeleton
- Uncaught exceptions on load (console)
- Overlay stuck covering the product
- Total inability to dismiss location or permission UI when alternatives exist

------------------------------------------------------------------------

# Release Validation

Align with `docs/RELEASE_PLAYBOOK.md`.

QA sign-off for release means:

- Regression suite for touched risk areas is green
- Smoke matrix above is complete
- Known severities are categorized; Sev-1/2 issues are resolved or explicitly
  accepted by the owner with written risk
- Documentation for user-visible trust behavior is updated when vocabulary or
  recovery paths changed

------------------------------------------------------------------------

# Bug Severity Definitions

| Severity | Definition | Example | Release impact |
|----------|------------|---------|----------------|
| **S1 — Critical** | Data loss, privacy breach, unusable primary surface, security exploit | Permanent full-page dimming; fabricated Live weather; secrets leaked | Block release |
| **S2 — Major** | Primary journey broken with weak workaround; widespread trust failure | Dashboard never leaves Updating; location cannot be set | Block unless owner accepts written risk |
| **S3 — Moderate** | Important feature impaired; workaround exists | One widget settles to Unavailable incorrectly; mobile overflow on secondary page | Fix soon; may ship with note |
| **S4 — Minor** | Polish, copy nits, rare edge cosmetic issues | Uneven spacing; non-blocking console noise on obscure path | Backlog |

Trust falsehoods (showing Live for invented data) escalate at least to **S2**,
often **S1**.

------------------------------------------------------------------------

# Test Reporting

## Automated run notes

When reporting automation:

- Command or suite name
- Pass/fail counts
- Environment (local static server, commit hash if known)
- Flakes observed (and whether rerun recovered)

## Manual QA notes

Include:

- Scope (apps/screens)
- Viewport(s) and browser
- Network conditions if relevant
- Steps to reproduce for failures
- Severity proposal
- Screenshots or short screen recordings when visual

## Bug report quality bar

A good bug report has: expected vs actual, environment, reproduction, and why
it matters for trust or usability—not only “broken.”

------------------------------------------------------------------------

# QA Checklists

## Work-block QA checklist

- [ ] Happy path for the changed product works on desktop width
- [ ] Same path checked at mobile width
- [ ] Refresh and back/forward considered if routing or mode state changed
- [ ] Loading / empty / offline / error honesty reviewed
- [ ] Rapid interaction (double submit, fast mode switch) attempted
- [ ] Related surfaces searched for the same defect class
- [ ] Automated tests added or updated for regressions
- [ ] Relevant suites executed; results recorded
- [ ] Console checked on primary path
- [ ] Residual risks written for release notes or Lessons Learned

## Pre-merge / pre-review checklist

- [ ] No S1 defects open on the change
- [ ] New overlays dismiss cleanly (Escape, mode change, completion)
- [ ] Progressive surfaces do not block on a single slow provider
- [ ] Copy avoids homework / fake-Live language

## Release QA checklist

- [ ] Smoke matrix complete
- [ ] Critical automation green
- [ ] Accessibility smoke complete
- [ ] Owner informed of accepted S3/S4 carryovers

------------------------------------------------------------------------

# Versioning

**QA Playbook v1.0.** Living document. When testing strategy changes (new CDP
harness, new severity rules, new smoke apps), update this handbook in the same
era as the process change—not months later.
