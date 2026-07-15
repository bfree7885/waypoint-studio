# Waypoint Studio Dashboard Playbook v1.0

> Product standards for live outdoor environmental intelligence.

The Outdoor Intelligence Dashboard helps people understand what is happening
outdoors around them—weather, light, trails, water, wildlife seasonality, and
related stewardship context—without fabricating certainty.

Complements:

- `docs/ENGINEERING-PLAYBOOK.md`
- `docs/PRODUCT_STANDARDS.md`
- `docs/UI_UX_PLAYBOOK.md`
- `docs/QA_PLAYBOOK.md`
- `docs/PERFORMANCE_PLAYBOOK.md`
- `docs/ACCESSIBILITY_PLAYBOOK.md`
- `docs/SECURITY_PLAYBOOK.md`
- `docs/RELEASE_PLAYBOOK.md`
- `docs/LESSONS_LEARNED.md`

------------------------------------------------------------------------

# Product Mission

Help people **observe and understand** outdoor conditions for their place and
time so they can prepare, explore, and care for land and wildlife more wisely.

The Dashboard is an intelligence surface—not a social feed, not a harvest
guarantor, and not a fake “always Live” weather toy.

------------------------------------------------------------------------

# Target Users

- Hikers, walkers, and weekend planners preparing for local conditions
- Photographers timing light, weather, and access
- Naturalists and stewards scanning seasonal change
- Anyone who wants calm regional awareness before going outside

Secondary: educators and parents seeking honest regional context without
homework theater.

------------------------------------------------------------------------

# Non-Negotiable Principles

1. **Never fabricate Live environmental data.**
2. **Distinguish facts, estimates, cached values, and failures.**
3. **Progressive loading is mandatory**—shell and structure before providers.
4. **Location privacy first**—transparent permissions; no invented home place.
5. **Providers may fail**—UI must reach honest terminals.
6. **Modules load independently**—one slow trail request must not freeze the page.
7. **Shared trust vocabulary**—Live, Updating, Partial, Cached, Offline,
   Provider Unavailable, Error, Estimated, Regional.
8. **Outdoor ethics** appear where relevant (wildlife, habitats, access)—never
   as trophy or engagement bait.

------------------------------------------------------------------------

# UX Expectations

- Briefing and location context are understandable within seconds of shell paint
- Cards present one job each; status tags are readable words, not color alone
- Customize/settings improve clarity; they must not bury primary conditions
- National or provisional shells (when locating) must not claim a specific
  false hometown
- Empty and unavailable cards teach the next step (retry, wait, reconnect)
- Voice stays calm and practical—“Waiting for weather provider…” beat hype

Follow UI/UX Playbook composition rules while accepting that Dashboard is
legitimately multi-widget after briefing.

------------------------------------------------------------------------

# Loading and Error States

| State | Expectation |
|-------|-------------|
| First paint | Shell + structure; honest Finding/Updating language |
| Per widget | Independent Updating → terminal trust state |
| Partial package | Partial trust visible; successful modules remain useful |
| Cached | Labeled Cached with age when practical |
| Offline | Offline label; cache if present; no fake Live |
| Provider timeout | Provider Unavailable + recovery |
| Location failure | Clear fallback path without inventing coordinates |

Anti-patterns: full-page freeze on one provider; remount flicker that feels
like a crash; “Live” while still waiting.

------------------------------------------------------------------------

# AI Behavior

Dashboard AI (if used for summaries, briefing phrasing, or coaching chips):

- Explain or summarize only from available package fields and editorial
  regional content
- Label heuristics and forecasts as such
- Never invent gauges, trail reports, species counts, or alerts
- Prefer silence or educational regional copy over speculative detail

AI must not override provider status tags.

------------------------------------------------------------------------

# Data Quality Expectations

- Weather, alerts, water, elevation, trails, and derived light/photo conditions
  come from defined providers or clearly editorial regional bundles
- Editorial/national content is labeled Regional or Estimated—not Live local
- Block status and package trust remain coherent across banner and cards
- Content-engine region bundles stay stewardship-safe and non-fabrication
- Cache continuity is allowed; honesty of age/trust is required

------------------------------------------------------------------------

# Accessibility Expectations

- Keyboard access to location controls, widget refresh, and customize flows
- Status available as text; live regions scoped (not the whole dashboard root)
- Focus returns after location prompts and dialogs
- Closed overlays never leave a dimming trap
- Comfortable targets for refresh and settings on mobile

Align with Accessibility Playbook; treat stuck overlays as critical defects.

------------------------------------------------------------------------

# Performance Expectations

- Structure paints without waiting for the slowest provider
- Specialty mounts do not duplicate platform provider fetches on progressive
  shell
- Prefer in-place hydrate over wiping the widget grid on every package arrival
- Known-slow providers (for example trails) stay off the critical path
- Seeded local evaluations should feel immediate for shell/structure

Align with Performance Playbook budgets and duplicate-request rules.

------------------------------------------------------------------------

# Release Quality Gates

Before shipping Dashboard changes:

- [ ] Progressive honesty still holds (shell → modules → terminals)
- [ ] No false Live / invented location
- [ ] Relevant reliability/stabilization tests pass
- [ ] Smoke: location path + at least one Live/Partial/Cached/Unavailable path
- [ ] Mobile width usable; no horizontal page trap
- [ ] Accessibility smoke for location prompt and primary widgets
- [ ] Docs/Lessons updated when trust vocabulary or boot behavior changes

S1/S2 trust or dimming defects block release (QA + Release playbooks).

------------------------------------------------------------------------

# Future Extensibility

Dashboard may later deepen modules (richer water, wildlife, air quality),
improve offline durability, or refine customization—without changing mission.

Extensions should:

- Reuse shared trust tags and shell patterns
- Keep provider failure first-class
- Avoid social feeds, streaks, or engagement farming
- Prefer local-first retention of user preferences

Do not prescribe stack choices here; preserve progressive assembly and honesty.

------------------------------------------------------------------------

# Versioning

**Dashboard Playbook v1.0.** Living product handbook. Update when trust
vocabulary, boot philosophy, or location ethics materially change.
