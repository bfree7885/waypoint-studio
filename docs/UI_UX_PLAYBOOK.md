# Waypoint Studio UI/UX Playbook v1.0

> Interface standards for every Waypoint Studio application.

This handbook defines how Waypoint Studio interfaces should look, feel, and
behave. It is written for product designers, engineers, and agents who ship
experiences across the ecosystem.

It complements:

- `docs/PRODUCT_STANDARDS.md` — product philosophy and trust
- `docs/ENGINEERING-PLAYBOOK.md` — engineering process and quality gates
- The shared Waypoint Design System (WDS) — tokens, shell, and components

When implementation detail and this handbook disagree, update one of them. Do
not invent a third silent standard.

------------------------------------------------------------------------

# Mission

Define how every Waypoint Studio interface should look, feel, and behave.

The lasting goals are:

- **Consistency** across products and sessions
- **Trust** through honest states and clear hierarchy
- **Clarity** over novelty
- **Accessibility** as a default, not a retrofit
- **Calm** as the emotional baseline of the platform

Technology should help people observe, understand, create, and share—without
visual noise, pressure, or deception.

This document should remain useful for years. Prefer durable principles over
fashionable layouts.

------------------------------------------------------------------------

# Design Philosophy

Waypoint Studio interfaces should feel:

| Quality | Meaning in practice |
|---------|---------------------|
| **Calm** | Steady surfaces, gentle transitions, no alarmist chrome |
| **Focused** | One primary job per viewport or section |
| **Trustworthy** | Status is readable; estimates never masquerade as facts |
| **Simple** | Fewer competing regions; whitespace earns its keep |
| **Helpful** | Empty, loading, and error states teach the next step |
| **Professional** | Crafted, not playful-for-its-own-sake |
| **Modern** | Contemporary type and spacing without trend theater |
| **Responsive** | Comfortable from phone to wide desktop |

They must avoid:

- Visual clutter (stat strips, badge piles, decorative borders that do no work)
- Dark patterns (forced urgency, deceptive contrast, trapped flows)
- Artificial urgency (“act now,” countdown scarcity, pulsing CTAs)
- Surprise interactions (controls that appear only on hover on touch devices;
  dialogs that open without cause)
- Unnecessary animation (motion that distracts from content)

**Composition rule.** The first viewport should usually read as one
composition: brand or product identity, a clear title or purpose, optional
supporting sentence, and the primary task. Do not fill the first screen with
secondary marketing modules, dense metadata, or competing cards unless the
surface *is* a dashboard by product intent.

**Dashboard exception.** Dashboards may show multiple widgets after a clear
briefing or location context. Even then, progressive reveal and honest
per-widget status keep the experience calm.

**Brand and product identity.** Branded surfaces should carry a strong product
signal in the first viewport—not only a nav label. Shared chrome never replaces
a product’s reason for being.

------------------------------------------------------------------------

# Navigation Standards

## Global navigation

Every application uses the shared application shell:

- Sticky global bar with Waypoint brand mark and product context
- Accessible Launcher / Apps control for moving between family products
- Consistent placement and labeling across apps

Global navigation must remain predictable. Do not invent a second top bar that
duplicates launcher destinations. Do not hide the Waypoint identity on product
homepages.

## Local navigation

Within a product:

- Local nav appears directly under the global bar
- Current section is indicated with `aria-current="page"` (or equivalent)
- Labels are plain language (“Dashboard”, “Coach”, “Library”)—not jargon
- Order is stable; new items are added deliberately, not opportunistically

## Page hierarchy

- One primary page title (`h1`) per view, visually or via accessible name
- Supporting sections use a descending heading scale without skips where
  possible (`h2` → `h3`)
- Decorative eyebrows may exist, but must not replace real headings for
  structure

## Breadcrumbs

Use breadcrumbs when the user is two or more levels deep in a content
hierarchy (for example Field guide → Region → Topic). Skip them on primary
product homes where local nav already answers “where am I?”

Breadcrumbs are navigational, not ornamental. Every crumb except the current
page is a link.

## Responsive navigation

- Compact viewports may collapse secondary local links into a disclosed menu
- The primary product destination remains one tap from the shell
- Launcher and skip links remain available at all widths
- Do not rely on hover-only menus for essential destinations

## Keyboard accessibility

- Tab order follows visual reading order
- Launcher, local nav, and primary actions are reachable without a pointer
- Escape closes dialogs, menus, and overlays and returns focus to the opener
- Skip link (“Skip to content”) targets the main landmark

------------------------------------------------------------------------

# Layout Standards

## Page rhythm

Use the design-system spacing scale (4px base). Prefer multiples of the scale
over arbitrary pixel values.

Typical vertical rhythm:

- Between major page sections: spacious (large gaps)
- Between related blocks inside a section: medium
- Between label and control, or title and body: tight-to-medium

Whitespace is a feature. Crowding is not density—it is noise.

## Maximum content widths

| Surface | Guidance |
|---------|----------|
| App shell / reading content | Comfortable measure; avoid endless full-bleed paragraphs |
| Primary dashboard / workspace | Wider grid allowed; retain outer page gutters |
| Modal dialogs | Constrained; never edge-to-edge on desktop |
| Forms | Narrow enough for scanning labels and errors |

Outer horizontal padding should grow slightly on larger screens and never pin
content against the viewport edge.

## Grid behavior

- Prefer CSS grid or flex rows with consistent gaps from the spacing scale
- Align card edges and section titles across a view when modules share a row
- Auto-fit or explicit breakpoints beat fixed multi-column layouts that crush
  on tablets
- Do not nest cards inside cards without a clear interactive reason

## Cards

Cards are containers for **interactive or independently refreshing modules**—
not decorative frames. Favor for dashboards, libraries, and chooser grids.
Avoid wrapping static narrative hero content in card chrome.

When cards are used:

- Consistent padding and corner radius from the design system
- Clear title, optional status tag, and body region
- One primary action per card when actions exist
- Status tags never replace body content

## Responsive breakpoints

Design mobile-first, then enhance. Practical bands used across the platform:

| Band | Intent |
|------|--------|
| Narrow phones | Single column; stacked controls; full-width primaries |
| Large phones / small tablets | Optional two-column widget grids |
| Tablets / small laptops | Stable multi-column dashboards; local nav may expand |
| Wide desktops | Generous grids; avoid ultra-wide line lengths for prose |

Exact token thresholds live in WDS CSS. Behaviors matter more than pixel
trivia: content must remain readable and tappable at every band.

## White space usage

- Separate “where am I?” chrome from “what can I do?” content
- Give hero and briefing areas room to breathe
- Collapse spacing only when a compact tool surface requires it (editors,
  compare panes)—never as a default aesthetic

------------------------------------------------------------------------

# Typography

## Role of typefaces

Waypoint Studio uses a dual-face system from WDS:

- **Display** for product titles, section headings, and expressive moments
- **Body** for UI chrome, paragraphs, forms, and dense data
- **Mono** sparingly for codes, coordinates, or technical identifiers

Do not introduce additional font families for a single screen without a product
reason and design-system update.

## Heading hierarchy

- `h1`: page or product purpose—one per view
- `h2`: major sections
- `h3`: subsections or card titles when they define structure
- Avoid styling non-heading text to look like headings without the semantics

Display headings may be large and graceful; they must not fight the brand mark
for dominance on marketing-like surfaces. On tool surfaces, headings stay
clear and subordinate to the task.

## Paragraph spacing and measure

- Body line-height stays open enough for outdoor and field reading conditions
- Paragraphs separate with consistent spacing—no cramped “wall of text”
- Ideal line length for long reading: roughly 60–75 characters
- UI helper text may be shorter; never microscopic for essential instructions

## Readability

- Prefer sentence case for UI labels
- Avoid all-caps paragraphs; limited all-caps may appear in tiny eyebrows
- Numbers and units remain unambiguous (“12 mph”, not cryptic icons alone)
- Do not gray out primary body text to the point of low contrast

## Accessible font sizing

- Base UI text must remain comfortably readable on a reference phone
- Do not ship essential UI below the small step of the type scale without an
  exceptional data-density reason
- Respect user/browser font scaling; avoid locking layouts to exact px heights
  that clip text

## Mobile typography

- Increase tap-label clarity; keep section titles single-purpose
- Prefer wrapping to truncation for critical labels
- Long product names may abbreviate only when the full name remains available
  to assistive technology

------------------------------------------------------------------------

# Colors

## Palette principle

Waypoint Studio’s trustworthy palette is grounded in deep navy surfaces, soft
parchment text, lime accents for affirmative actions and focus, and muted
purple as a secondary warm note. Products may tune accent emphasis through
product theming, but must preserve contrast and meaning.

Color supports hierarchy and status. It never carries meaning alone.

## Semantic colors

| Intent | Role |
|--------|------|
| **Success / Live** | Healthy completion or live provider data |
| **Warning / Partial / Cached** | Degraded but usable; user should notice |
| **Error** | Failure that blocks or invalidates an action |
| **Information** | Neutral guidance, tips, methodology notes |
| **Disabled** | Inactive controls; clearly non-interactive |
| **Focus** | High-visibility focus ring compatible with the accent system |

Status tags (Live, Updating, Partial, Cached, Offline, Provider Unavailable,
Error, Estimated, Regional) use shared vocabulary from dashboard reliability
patterns. Do not invent synonym tags per product.

## Focus indicators

- Every interactive control shows a visible focus state
- Focus must meet contrast expectations against adjacent surfaces
- Do not remove outlines without providing an equivalent custom ring
- Focus appearance stays consistent across apps

## Color independence

Always pair color with text, icon shape, or pattern:

- Errors include text, not only a red border
- Charts and maps use labels or patterns in addition to hue
- Status tags include words, not only colored pills

------------------------------------------------------------------------

# Buttons and Controls

## Action hierarchy

| Kind | Use when |
|------|----------|
| **Primary** | The single most important next step in the view |
| **Secondary** | Safe alternatives (Cancel, Use default, Change location) |
| **Ghost / tertiary** | Low-emphasis actions that should not compete |
| **Destructive** | Irreversible or costly actions (delete, clear library) |

One primary button per action region. Multiple primaries dilute trust.

## States

- **Default:** clear label, sufficient contrast
- **Hover (pointer):** subtle emphasis without leaping layout
- **Focus-visible:** strong ring or outline; keyboard users must never guess
- **Active / pressed:** momentary confirmation
- **Disabled:** non-interactive; explain nearby if the reason is not obvious
- **Loading:** button may show busy state but must not look identically like
  Disabled without an accessible name update

## Touch targets

- Minimum interactive target should meet common comfortable touch size
  (about 44×44 CSS pixels or equivalent hit area)
- Spacing between adjacent targets prevents mistaps
- Icon-only controls need accessible names

## Control hygiene

- Prefer native semantics (`button`, `a`, `input`) over clickable `div`s
- Links navigate; buttons perform actions
- Do not overload icons with conflicting metaphors across products

------------------------------------------------------------------------

# Forms

## Labels

- Every field has a visible label
- Placeholder text is never the only label
- Group related fields with legends or section titles when helpful

## Required fields

- Indicate required fields clearly before submit
- Do not wait until a full-page failure to reveal requirements
- Optional fields may be marked “Optional” when most fields are required

## Inline help

- Short helper text sits under the field it clarifies
- Link to deeper methodology or privacy notes when location or permissions
  are involved
- Help text never replaces validation messages

## Validation

- Validate on submit at minimum; validate earlier when it prevents clear
  mistakes (format of coordinates, empty search)
- Preserve user input after failed validation
- Focus the first invalid field when a form fails

## Error messaging

- Specific and calm: “Enter a county or state name” beats “Invalid”
- Place errors adjacent to the field; summarize only for long forms
- Never blame the user; describe what to do next

## Success messaging

- Confirm completed actions briefly
- Prefer updating the UI in place (new location applied, photo saved) over
  modal success theater
- Persistent success banners are rare; toast-like status may dismiss without
  trapping focus

------------------------------------------------------------------------

# Loading States

Loading is part of the product’s honesty.

## Requirements

- **Progressive rendering:** paint shell, navigation, and known structure
  immediately
- **Independent modules:** widgets and panels may finish at different times
- **Honest language:** prefer “Updating”, “Finding your location…”,
  “Waiting for weather provider…” over vague “Please wait”
- **Skeletons** for known layouts when they reduce layout shift
- **No frozen screens:** something always indicates life or a terminal state
- **No unexplained spinners:** if a spinner appears, nearby text says what is
  loading

## Anti-patterns

- Blocking the entire app on every provider
- Remounting a full page when a single module refreshes (unless region or
  location context truly changed)
- Fake progress bars without meaningful milestones
- Showing “Live” while still waiting for data

## Trust tags during load

Operational modules use a shared tag language. Loading or in-flight updates
must not impersonate Live success.

------------------------------------------------------------------------

# Empty States

Empty is a teaching moment, not a void.

Every empty state explains **what is empty**, **why it might be empty**, and
**what the user can do next**.

| Situation | Guidance |
|-----------|----------|
| **No data** | Say what would appear and how to generate or enable it |
| **First-time use** | Orient briefly; invite one clear first action |
| **Offline** | State offline clearly; offer retry or cached alternatives |
| **Permission denied** | Explain which permission and how to grant or continue with a fallback |
| **Provider unavailable** | Name the dependency class when useful; offer retry; never invent values |

Empty states may include a single primary action. They should not dump a
tour of marketing modules.

------------------------------------------------------------------------

# Error States

## Honest messaging

- Describe the failure in plain language
- Distinguish local mistakes (validation) from upstream failures (provider,
  network)
- Do not use humor that obscures recovery

## Recovery actions

Offer at least one constructive path when possible:

- Retry
- Change location
- Continue with partial / cached data (labeled as such)
- Open settings or permissions
- Reload the view

## Retry behavior

- Retry is explicit and user-initiated for costly or rate-limited providers
- Automatic retries—if any—must be limited and never create request storms
- After retry, reuse the same honest loading language

## Logging expectations

- Client-side diagnostic snapshots may capture non-sensitive UI state for
  local debugging
- Do not log secrets, exact high-precision location to third parties, or
  private photo contents
- User-visible errors and developer logs should be reconcilable without
  exposing private detail in the UI

------------------------------------------------------------------------

# Accessibility

Accessibility is a release requirement, not a polish phase.

## Keyboard navigation

- All meaningful actions are keyboard operable
- Custom widgets provide arrow-key patterns only when they match platform
  conventions and still expose semantics
- No keyboard traps outside intentional modal focus locks

## Focus management

- Opening a dialog moves focus into the dialog
- Closing returns focus to the control that opened it
- Route or mode changes move focus to a sensible heading or main region
- Hidden overlays (`hidden`, `display: none`) must not intercept focus or
  clicks—especially full-viewport scrims

## ARIA support

- Prefer native elements first
- Use ARIA to fill gaps (dialogs, tabs, live status), not to re-create HTML
- Status regions that update should use appropriately scoped live regions—
  avoid announcing the entire page on every hydrate

## Contrast

- Text, icons, and focus rings meet WCAG AA contrast targets for normal UI
- Disabled and muted styles remain distinguishable without becoming the only
  cue for errors

## Reduced motion

- Honor `prefers-reduced-motion`
- Replace large motion with gentle opacity or instant state changes
- Never require motion to complete a task

## Screen readers

- Images that convey meaning have alternatives; decorative images are marked
  decorative
- Controls have accessible names
- Dynamic status (Updating, Offline, Error) is available in text

## Touch and pointer

- Targets remain large enough on mobile
- Hover content is available by other means on touch devices

------------------------------------------------------------------------

# Mobile Standards

## Mobile-first thinking

Design the constrained layout first. Enhance to wider grids. Desktop sprawl
that later “collapses badly” is a design failure.

## Touch-friendly layouts

- Stack primary actions vertically when horizontal clusters get tight
- Avoid precise drag-only interactions without simpler alternatives
- Keep destructive actions clearly separated from primary actions

## Responsive cards

- Cards stack to one column on narrow screens
- Internal card grids collapse before text overflows
- Status tags wrap rather than clip

## Thumb reach

- Frequent actions sit within comfortable reach zones when practical
- Sticky action bars may help editors; they must not obscure critical content
  without a way to dismiss or scroll

## Safe areas

- Respect notches and home-indicator insets
- Fixed UI accounts for safe-area insets so controls are not obscured

## Orientation handling

- Portrait is the default assumption for phones
- Landscape must remain usable for tools that photographers and field users
  rotate—tighten padding rather than clipping essential controls
- Avoid locking orientation unless a specialized capture experience requires it

------------------------------------------------------------------------

# Motion

Motion exists to communicate hierarchy, continuity, and feedback—not to
decorate.

## Principles

- **Purposeful:** enter/exit for overlays, gentle expansion for disclosure,
  feedback for successful save
- **Short:** most UI transitions stay brief so the interface feels responsive
- **Interruptible:** users can navigate away without waiting for choreography
- **Optional:** reduced-motion users get an equivalent experience

## Do not

- Animate continuously (ambient pulsing CTAs, looping attention grabbers)
- Parallax that harms readability or performance on low-end devices
- Surprise motion on first paint that looks like instability
- Use motion to hide missing content

------------------------------------------------------------------------

# Waypoint Studio Design Language

Waypoint Studio is one ecosystem. Applications share a design language while
keeping a distinct product purpose.

## Shared across every app

| Element | Shared expectation |
|---------|--------------------|
| **Navigation** | Global shell + local product nav |
| **Components** | Buttons, forms, tabs, dialogs, uploads from WDS |
| **Card styling** | Common radii, borders, padding, title patterns |
| **Status tags** | Shared trust vocabulary and colors |
| **Icons** | Consistent metaphor and stroke weight |
| **Dialogs** | Focus trap, backdrop dismiss rules, Escape to close |
| **Empty states** | Explanation + next step |
| **Loading patterns** | Progressive shell, per-module honesty |
| **Error patterns** | Calm copy + recovery |

## Product identity within the family

Each product may emphasize imagery, accent intensity, or domain vocabulary
(trails, fungi, light, scenes) as long as:

- Shell navigation remains recognizable
- Tokens remain from WDS (or documented product overrides)
- Trust tags and privacy behaviors do not fork conflicting meanings
- Accessibility and responsive behavior stay intact

Identity is expressed through purpose and content—not through a completely
different UI kit.

## Overlay and visibility discipline

Any overlay, modal, prompt, or column that uses author `display: flex|grid`
must honor the HTML `hidden` attribute with an explicit hide rule. A closed
overlay that still dims the page is a critical defect.

------------------------------------------------------------------------

# Content Voice in the Interface

UI copy inherits Product Standards:

- Calm and encouraging—not paternal and not hype
- Teach through observation and coaching—not homework language
- Prefer concrete terms (“Provider unavailable”) over vague ones (“Something
  went wrong”) when the distinction helps recovery
- Never invent readings, sightings, or trail reports to fill space

------------------------------------------------------------------------

# Review Checklist

Use this checklist at the end of every UI-facing work block.

## Philosophy and trust

- [ ] Interface feels calm and focused; no urgency or engagement tricks
- [ ] Facts, estimates, cached data, and failures are distinguishable
- [ ] No fabricated or placeholder values presented as live truth
- [ ] Loading and error language is honest

## Navigation and structure

- [ ] Global and local navigation match shell conventions
- [ ] One clear `h1` / page purpose; heading order is sensible
- [ ] Keyboard can reach primary tasks; Escape closes overlays
- [ ] Skip link and landmarks make sense

## Layout and visual design

- [ ] Spacing follows WDS scale; no accidental cramped regions
- [ ] Cards used only where they earn their weight
- [ ] Hierarchy is clear at a glance on desktop and mobile
- [ ] No full-viewport dimming or dead overlays when UI should be idle

## Typography and color

- [ ] Display/body roles respected; text remains readable when scaled
- [ ] Semantic color paired with text or icon—not color alone
- [ ] Focus indicators visible on all interactive controls

## Controls and forms

- [ ] Primary / secondary / destructive actions are unambiguous
- [ ] Touch targets are comfortable; disabled states are clear
- [ ] Labels, errors, and helper text meet form standards

## States

- [ ] Progressive loading; no frozen blank screens
- [ ] Empty states explain next steps
- [ ] Errors offer recovery; retries do not storm providers
- [ ] Offline / permission / provider gaps are handled explicitly

## Accessibility and motion

- [ ] Keyboard, focus, ARIA, contrast, and screen-reader checks done
- [ ] `prefers-reduced-motion` respected
- [ ] Motion is purposeful and brief

## Mobile

- [ ] Mobile-first layout verified
- [ ] Safe areas and orientation do not hide critical controls
- [ ] No hover-only essential actions

## Ecosystem consistency

- [ ] Shared components and status tags reused where applicable
- [ ] Product identity remains clear without forking a new design system
- [ ] Related surfaces searched for the same UI defect class

------------------------------------------------------------------------

# Versioning

This is **Waypoint Studio UI/UX Playbook v1.0**, a living document.

Future versions should incorporate lessons from shipped work while preserving
the mission: calm, trustworthy, clear, accessible interfaces that help people
observe more of the living world.

When a major design improvement lands—new shell patterns, revised status
vocabulary, or a redefined type ramp—update this handbook in the same change
set or immediately afterward. Do not allow silent drift between pixels and
principle.

**Changelog seed**

| Version | Notes |
|---------|-------|
| v1.0 | Initial handbook aligned with Product Standards, Engineering Playbook, and WDS shell/token practice (2026-07) |
