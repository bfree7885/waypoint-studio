# Waypoint Studio Engineering Playbook v1.0

Canonical session operating model for agents and humans. A concise Cursor rule
mirrors the hard gates in `.cursor/rules/engineering-playbook.mdc`.

Product philosophy (trust, privacy, education, AI honesty) lives in
`docs/PRODUCT_STANDARDS.md` and `.cursor/rules/product-standards.mdc`.

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
