# Waypoint Studio Performance Playbook v1.0

> Speed, progressive rendering, and perceived performance standards.

People use Waypoint Studio before hikes, during field breaks, and on variable
networks. Performance is part of trust: a frozen screen feels broken even when
work is happening invisibly.

Complements:

- `docs/ENGINEERING-PLAYBOOK.md`
- `docs/PRODUCT_STANDARDS.md`
- `docs/UI_UX_PLAYBOOK.md` — loading honesty and calm motion
- `docs/QA_PLAYBOOK.md` — slow-network and smoke validation
- `docs/ACCESSIBILITY_PLAYBOOK.md` — reduced motion and responsive cost
- `docs/RELEASE_PLAYBOOK.md` — performance as a ship consideration
- `docs/LESSONS_LEARNED.md`

------------------------------------------------------------------------

# Mission

Make every product feel immediate.

The interface should paint structure quickly, improve progressively as data
arrives, and never appear frozen. Optimize for field-real networks and devices,
not only lab Wi‑Fi and warm caches.

------------------------------------------------------------------------

# Performance Philosophy

1. **Perceived performance is the product metric.** Time-to-shell and
   time-to-first-useful-module beat pure total-load completeness.
2. **Progressive enhancement is mandatory.** Shell and navigation before
   providers; modules independently.
3. **Honesty over fake speed.** Skeletons and Updating tags are correct;
   invented Live values are not an optimization.
4. **Eliminate duplicate work before micro-optimizing.** One Open-Meteo fan-out
   beats three competing mounts calling the same API.
5. **Measure when claiming wins.** Prefer observable timings (marks, CDP, or
   careful manual notes) over intuition alone.
6. **Simplicity scales.** Smaller boot graphs and fewer blocking script chains
   remain the durable strategy.

------------------------------------------------------------------------

# Startup Behavior

## Desired boot sequence

1. Shared shell chrome (brand, nav landmarks)
2. Honest page-level waiting copy or skeleton **briefly** if needed
3. Product structure (dashboard grid, tool layout) with per-module Updating
4. Independent module completion toward terminal states
5. Late enrichment (slow providers such as trails) without remounting the world

## Startup anti-patterns

- Waiting on `Promise.all` of every provider before first paint
- Blocking UI on species preload, map tiles, or secondary analytics
- Multiple competing bootstraps for the same location key
- Cold start inventing a false specific location to “feel fast”

## Cold start guidance

- Safe stored location may start early work
- Without safe stored location, a national or product-neutral shell is allowed
  if it does not claim a place the user did not choose
- Engine publish / sentinel coordinates must not be presented as “you”

------------------------------------------------------------------------

# Progressive Rendering

Progressive rendering means:

| Stage | User sees |
|-------|-----------|
| Shell | Navigation and page frame |
| Structure | Cards, panes, or tool columns |
| Partial data | Some modules Live/Partial/Cached while others Updating |
| Settled | Modules reach honest terminals; late modules may still update |

## Rules

- Prefer in-place refresh of modules over full `innerHTML` wipes of the page
- When location/region truly changes, remounting structure is acceptable—
  document the flash as intentional
- Widget mounts must not each re-enter the outdoor intelligence service during
  progressive shell paint unless explicitly opted into direct fetch for a
  legacy path

------------------------------------------------------------------------

# Rendering Budgets

Budgets are aspirational targets for local and staging evaluation. Field
networks vary; use budgets to catch regressions, not to shame edge geography.

| Milestone | Target mindset |
|-----------|----------------|
| Shell interactive | Immediate after HTML/CSS/JS parse—feels instant |
| Structure / grid visible | Well under a few seconds on broadband; remains honest on slow networks |
| First populated module | Arrives independently; should not wait for the slowest sibling |
| Full provider set | May take longer; UI already usable |

When a change doubles time-to-structure on a seeded local path, treat that as a
performance defect until explained.

Optional instrumentation (performance marks for shell ready, first Live widget,
package hydrated) should be preferred for recurring surfaces like Dashboard.

------------------------------------------------------------------------

# Network Budgets

## Principles

- One authoritative fetch path per provider concern per boot generation
- Soft timeouts so one hung service cannot strand the page
- Prefer cache-plus-honesty over aggressive retry storms
- Trails and other known-slow providers stay off the critical paint path

## Practical constraints

| Concern | Guidance |
|---------|----------|
| Weather / forecast | Single assemble path during boot; mounts wait for platform |
| Alerts / water / elevation | Parallel soft settle; failure soft-degrades |
| Trails / Overpass | Late enrichment; long timeout allowed off critical path |
| Region JSON | Required for structure—optimize caching and payload size over time |
| Third-party fonts | Use existing shared faces; avoid per-page unique families |

------------------------------------------------------------------------

# Caching Strategy

## Layers (conceptual)

| Cache | Role |
|-------|------|
| Memory package (`lastPackage`-style) | Offline and failed refresh continuity for a session |
| Location storage | Soft-cached coordinates and region binding |
| Provider TTL caches | Reduce repeat upstream calls within TTL |
| HTTP cache headers | Static assets and content-engine JSON where safe |

## Honesty rules

- Cached UI must label Cached (or Offline)—never Live
- Stale trail or weather bodies need age or trust signaling when shown
- Clearing caches is a user-recoverable act; do not surprise-wipe without cause

Long-term durable offline weather persistence may evolve; until then, document
session memory limits rather than pretending infinite offline depth.

------------------------------------------------------------------------

# Duplicate Request Prevention

Duplicate requests are a common Waypoint regression class.

## Watch for

- Progressive shell mounts calling the same forecast API as the platform
  assembler
- Concurrent `init` for identical region/coords without coalescing
- Duplicate script tags loading shell/nav modules twice
- Refresh loops stacking overlapping generations without cancellation
- Rapid location changes that do not supersede in-flight work cleanly

## Expectations

- Coalesce identical in-flight initializations
- Cancel or ignore stale generations when a newer location wins
- Opt-in flags for direct fetch on mounts that historically self-fetched

------------------------------------------------------------------------

# Layout Shift Prevention

Cumulative layout shift harms calm UX.

## Practices

- Reserve space for known card grids and media aspect ratios
- Prefer skeletons matching final structure
- Avoid injecting tall banners above content after first paint without
  reserved space
- Font loading should not reflow primary headings violently—shared faces and
  sensible fallbacks help
- In-place hydrate of module bodies is preferable to rebuilding the entire
  main tree

Accept small shifts when location briefing text length changes; reject shifts
that shove the whole dashboard after a late remount.

------------------------------------------------------------------------

# Bundle Management

## Guidance

- Prefer the shared design-system loader graph over copying modules into each
  app
- Do not add large libraries for one-page novelty
- Avoid shipping duplicate copies of nav/shell scripts in HTML when the loader
  already includes them
- Keep product-specific scripts thin; push shared behavior into WDS modules

Review bundle impact when introducing new global dependencies. Local-first
products should not require heavyweight frameworks without clear benefit.

------------------------------------------------------------------------

# Lazy Loading

Lazy load when it improves startup without breaking trust.

## Good candidates

- Heavy editors opened from secondary routes
- Large galleries beyond the first viewport
- Optional maps or diagnostic panels
- Rarely used customize drawers’ deep dependencies

## Poor candidates

- Critical shell and navigation
- Trust status for primary dashboard modules (lazy modules still need honest
  waiting UI if deferred)
- Anything required to dismiss an overlay that blocks the page

Lazy content must not strand keyboard users or fail to announce loading.

------------------------------------------------------------------------

# Profiling Workflow

## Lightweight loop

1. State the user-visible symptom (slow shell, flicker, duplicate network)
2. Reproduce on a seeded location with cache disabled once
3. Capture Network waterfalls and note duplicate hosts
4. Capture Performance panel long tasks if interaction jank is reported
5. Fix the root cause (boot graph, remount, duplicate fetch)
6. Re-measure the same scenario
7. Add a regression test when the failure mode is stable enough

## Field realism

- Throttle CPU and network when validating perceived wins
- Test cold and warm loads
- Prefer median of a few runs over a single hero number

## What to record in reports

- Scenario and latency conditions
- Shell / structure / first-module timings if available
- Request counts for hot endpoints (for example Open-Meteo)
- Whether fix improved perceived calm (flicker gone) even if totals similar

------------------------------------------------------------------------

# Performance Review Checklist

- [ ] Shell and navigation appear without waiting on all providers
- [ ] Progressive structure paints with honest per-module status
- [ ] No duplicate boot fetches for the same provider concern
- [ ] In-place hydrate preferred over full page wipe on data arrival
- [ ] Slow providers are off the critical path or soft-timed out
- [ ] Cached / offline paths do not imply Live
- [ ] Layout shift from late remounts avoided where possible
- [ ] No new heavyweight dependency without justification
- [ ] Duplicate script includes removed from app HTML when loader owns them
- [ ] Cold start does not invent a false specific place
- [ ] Measurement or careful qualitative note included for claimed wins
- [ ] Related surfaces searched for the same performance anti-pattern

------------------------------------------------------------------------

# Versioning

**Performance Playbook v1.0.** Living document. Update when budgets,
instrumentation, or boot architecture materially change.
