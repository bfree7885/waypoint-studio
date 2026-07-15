# Waypoint Studio Accessibility Playbook v1.0

> Inclusive design and verification standards for every application.

Accessibility is how Waypoint Studio keeps curiosity available to more people—
in bright trailheads, dim indoor evenings, with keyboards, screen readers,
magnifiers, and reduced motion preferences.

Complements:

- `docs/PRODUCT_STANDARDS.md` — accessibility by default
- `docs/UI_UX_PLAYBOOK.md` — shared interface expectations
- `docs/ENGINEERING-PLAYBOOK.md` — quality gates
- `docs/QA_PLAYBOOK.md` — minimum verification duties
- `docs/PERFORMANCE_PLAYBOOK.md` — motion and responsive cost
- `docs/LESSONS_LEARNED.md`

------------------------------------------------------------------------

# Mission

Ship interfaces that work with diverse bodies, devices, and assistive
technologies—without treating accessibility as optional polish.

If a person cannot dismiss an overlay, read a status tag, or complete location
setup with a keyboard, the product has failed regardless of visual beauty.

------------------------------------------------------------------------

# Accessibility Philosophy

1. **Native first.** Prefer semantic HTML before ARIA.
2. **Equivalence.** Tasks completable with pointer must be completable with
   keyboard and with assistive technology where reasonably supported.
3. **Perception multiplicity.** Never rely on color, motion, or sound alone.
4. **Calm announcements.** Live regions should inform, not narrate every DOM
   rewrite.
5. **Field conditions.** Contrast and type must hold up outside ideal studio
   monitors.
6. **Progressive honesty extends to AT.** Updating, Offline, and Error must be
   available as text—not only as colored chips.

------------------------------------------------------------------------

# WCAG Alignment

Waypoint Studio aims for **WCAG 2.2 Level AA** for primary product journeys.

## Priority topics for this codebase

| Area | Intent |
|------|--------|
| Perceivable | Contrast, text alternatives, adaptable layouts |
| Operable | Keyboard, focus order, target size, motion control |
| Understandable | Predictable nav, clear errors, consistent labels |
| Robust | Valid roles/states; works with current AT |

Where AA is not yet met, document gaps honestly rather than claiming
compliance. New work must not dig the hole deeper.

------------------------------------------------------------------------

# Keyboard Navigation

## Requirements

- All primary actions reachable via Tab / Shift+Tab
- Logical order matches visual order
- Enter/Space activate buttons and controls appropriately
- Escape closes dialogs, menus, launcher panels, and compare overlays
- Arrow keys may enhance composites (tabs, listboxes) but must not be the only
  path when a simpler tab stop pattern works

## Common failures

- Custom clickable `div`s without roles or key handlers
- Hidden overlays still in tab order
- Toolbars that swallow Tab without exit
- Mode switches that move visual focus without moving DOM focus

------------------------------------------------------------------------

# Focus Management

## Opening and closing

| Event | Focus behavior |
|-------|----------------|
| Open dialog / prompt | Move focus inside; trap while open |
| Close dialog / prompt | Return focus to opener |
| Route or product mode change | Move focus to main heading or primary region when context resets |
| Toast / status only | Do not steal focus; use polite live text if needed |

## Visibility

- `:focus-visible` styles remain obvious on interactive elements
- Do not set `outline: none` without an equivalent high-contrast custom ring
- Focus must not be stranded on `display: none` or `hidden` nodes

## Overlay discipline

Closed UI with author `display: flex` that ignores HTML `hidden` can leave a
scrim that blocks pointer and confuses AT. Treat undismissible dimming as an
accessibility **and** functional Sev-1/S2 defect.

------------------------------------------------------------------------

# Screen Readers

## Practices

- One meaningful `h1` per view (visually hidden is acceptable when design
  requires a decorative treatment elsewhere)
- Landmarks: `header`/`nav`/`main`/`footer` (or roles) used consistently via
  the app shell
- Images: informative images need alternatives; decorative images are hidden
  from AT
- Icon-only controls need accessible names
- Tables and grids expose row/column clarity when used for data

## Dynamic content

- Prefer updating textual status inside modules
- Scope `aria-live` narrowly; avoid polite-live on large dashboard roots that
  re-render often
- `aria-busy` may mark in-flight modules; clear it when terminal

------------------------------------------------------------------------

# ARIA Guidance

ARIA is a bridge—not a first language.

## Prefer native

- `button`, `a[href]`, `input`, `select`, `textarea`, `dialog` (where supported
  and styled carefully)
- Native `hidden` for closed content that should leave the accessibility tree

## Acceptable ARIA patterns

- `role="dialog"` with labeling for modal prompts when native dialog is not
  used
- `aria-current="page"` for local navigation
- `aria-expanded` / `aria-controls` for disclosure and launchers
- `aria-invalid` and associated error text for forms
- Status roles or live regions for operational updates

## Avoid

- Redundant roles on native elements
- ARIA that lies (`aria-hidden="true"` on focused content)
- Role soup that recreates entire applications without keyboard support

------------------------------------------------------------------------

# Contrast

- Primary text and essential icons meet AA contrast against their surfaces
- Status tags must remain readable; if a tag color fails, strengthen text or
  border treatment
- Focus indicators contrast against both the control and adjacent background
- Disabled controls may be weaker but must still read as disabled—not as body
  text

Test critical surfaces in both the default studio theme and any light product
overrides if present.

------------------------------------------------------------------------

# Typography

Aligned with UI/UX Playbook:

- Do not rely on micro type for essential instructions
- Allow browser zoom and font scaling without clipped controls
- Keep line length readable for long-form education content
- Avoid using color-differences-only to separate headings from body

------------------------------------------------------------------------

# Reduced Motion

Honor `prefers-reduced-motion: reduce`.

| With motion | Reduced-motion alternative |
|-------------|----------------------------|
| Panel slide/fade | Instant or minimal opacity |
| Parallax / large stage motion | Static framing |
| Decorative loops | Off |

Never require animation to complete a task. Performance work that removes
jank also helps vestibular comfort—but reduced-motion support remains
explicit.

------------------------------------------------------------------------

# Touch Targets

- Comfortable minimum target size for primary controls (about 44×44 CSS pixels
  or equivalent padding hit area)
- Adequate spacing between adjacent destructive and primary actions
- Do not place essential controls exclusively in hard-to-reach corners without
  alternatives

------------------------------------------------------------------------

# Responsive Accessibility

Accessibility must hold as layouts reflow.

- Reordered mobile layouts keep sensible focus order
- Collapsed navigation remains operable by keyboard and AT
- Horizontal scroll traps are not the only way to reach content
- Landscape phone layouts do not hide dismiss controls for dialogs

Zoom to 200% on a representative page during major UI changes when feasible.

------------------------------------------------------------------------

# Accessibility Review Checklist

## Structure and semantics

- [ ] Native elements preferred; ARIA used deliberately
- [ ] Landmarks and heading outline make sense
- [ ] Images and icon buttons named correctly

## Keyboard and focus

- [ ] Full keyboard pass of the changed journey
- [ ] Focus visible throughout
- [ ] Dialogs/menus manage focus in and out
- [ ] Escape dismisses new overlays; no leftover scrim

## Perception

- [ ] Status not color-only
- [ ] Contrast checked for primary text and tags
- [ ] Reduced motion respected for new animation

## Dynamic states

- [ ] Loading/error/offline available as text
- [ ] Live regions scoped (no page-wide announce storms)
- [ ] `aria-busy` cleared on terminal states

## Mobile / touch

- [ ] Targets comfortable; no hover-only essentials
- [ ] Reflow preserves operability

## Regression

- [ ] Similar overlays and prompts checked for the same AT trap
- [ ] Findings filed with severity aligned to QA Playbook

------------------------------------------------------------------------

# Versioning

**Accessibility Playbook v1.0.** Living document. Update when WCAG targets,
shell patterns, or status-announcement practices change.
