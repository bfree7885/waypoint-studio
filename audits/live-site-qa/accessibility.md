# Accessibility Findings

**Automated only** via `@axe-core/playwright` tags `wcag2a` + `wcag2aa` on each audited page load.
Manual keyboard spot-check: home Tab focus reached “Waypoint Studio” with visible outline (see README interactions).
**Not a full WCAG audit** — no screen-reader pass, no exhaustive touch-target measurement.

### Frequency (across route analyses)

| Rule ID | Approx. route hits |
| --- | ---: |
| color-contrast | 102 |
| nested-interactive | 7 |
| aria-prohibited-attr | 7 |
| document-title | 2 |
| html-has-lang | 2 |
| aria-required-children | 1 |

---

## https://waypointstudio.org/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 1

## https://waypointstudio.org/about.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 1

## https://waypointstudio.org/privacy.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 1

## https://waypointstudio.org/contact.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 4

## https://waypointstudio.org/support.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 1

## https://waypointstudio.org/knowledge.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 49

## https://waypointstudio.org/settings.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 8

## https://waypointstudio.org/apps/dashboard/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 5

## https://waypointstudio.org/apps/scenes/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 4

## https://waypointstudio.org/apps/photo-coach/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 6
- **nested-interactive** (serious) — Ensure interactive controls are not nested as they are not always announced by screen readers or can cause focus problems for assistive technologies — nodes: 1

## https://waypointstudio.org/apps/hidden-landscapes/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2
- **nested-interactive** (serious) — Ensure interactive controls are not nested as they are not always announced by screen readers or can cause focus problems for assistive technologies — nodes: 1

## https://waypointstudio.org/apps/photo-library/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 4

## https://waypointstudio.org/apps/scenes/photographer-profile/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/shed-hunting/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 7

## https://waypointstudio.org/apps/foragecast/

- **aria-prohibited-attr** (serious) — Ensure ARIA attributes are not prohibited for an element's role — nodes: 1
- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 11

## https://waypointstudio.org/apps/fieldry/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 4

## https://waypointstudio.org/apps/signalterrain/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 13

## https://waypointstudio.org/apps/signalterrain/cyber/live.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 12

## https://waypointstudio.org/apps/signalterrain/cyber/live.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 12

## https://waypointstudio.org/apps/steepleaf/#home

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 5

## https://waypointstudio.org/apps/savant-sommelier/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 122

## https://waypointstudio.org/apps/waypoint-volunteer/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 9

## https://waypointstudio.org/apps/waypoint-volunteer/discover.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/animal-vision/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 4
- **nested-interactive** (serious) — Ensure interactive controls are not nested as they are not always announced by screen readers or can cause focus problems for assistive technologies — nodes: 1

## https://waypointstudio.org/apps/dashboard/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 5

## https://waypointstudio.org/docs/WAYPOINT-KNOWLEDGE-PLATFORM.md

- **document-title** (serious) — Ensure each HTML document contains a non-empty <title> element — nodes: 1
- **html-has-lang** (serious) — Ensure every HTML document has a lang attribute — nodes: 1

## https://waypointstudio.org/docs/WAYPOINT-EDITORIAL-STANDARDS.md

- **document-title** (serious) — Ensure each HTML document contains a non-empty <title> element — nodes: 1
- **html-has-lang** (serious) — Ensure every HTML document has a lang attribute — nodes: 1

## https://waypointstudio.org/index.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 1

## https://waypointstudio.org/apps/scenes/photo-library/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/scenes/photo-coach/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 6

## https://waypointstudio.org/apps/scenes/hidden-landscapes/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/scenes/living-scenes/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/scenes/scene-builder/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/photo-coach/guide/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 46

## https://waypointstudio.org/apps/hidden-landscapes/gallery.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/hidden-landscapes/learn.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/photo-coach/profile/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 41

## https://waypointstudio.org/apps/foragecast/conditions.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 10

## https://waypointstudio.org/apps/foragecast/species.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 12

## https://waypointstudio.org/apps/foragecast/map.html

- **aria-prohibited-attr** (serious) — Ensure ARIA attributes are not prohibited for an element's role — nodes: 1
- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 9

## https://waypointstudio.org/apps/foragecast/timeline.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 7

## https://waypointstudio.org/apps/foragecast/weather.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 3

## https://waypointstudio.org/apps/foragecast/habitats.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 14

## https://waypointstudio.org/apps/foragecast/learn.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/foragecast/journal.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/foragecast/settings.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 6

## https://waypointstudio.org/apps/foragecast/index.html

- **aria-prohibited-attr** (serious) — Ensure ARIA attributes are not prohibited for an element's role — nodes: 1
- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 11

## https://waypointstudio.org/apps/foragecast/property.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/signalterrain/topics.html

- **aria-required-children** (critical) — Ensure elements with an ARIA role that require child roles contain them — nodes: 1
- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/signalterrain/graph.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/signalterrain/summary.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/signalterrain/cyber/workspace.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 3

## https://waypointstudio.org/apps/signalterrain/cyber/teaching.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/signalterrain/cyber/brief.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 40

## https://waypointstudio.org/apps/signalterrain/cyber/explorer.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/signalterrain/cyber/advisor.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/signalterrain/cyber/knowledge.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/signalterrain/cyber/ingest-health.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 13

## https://waypointstudio.org/apps/steepleaf/explore/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/steepleaf/entity/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/savant-sommelier/learn.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 139

## https://waypointstudio.org/apps/savant-sommelier/cellar.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 3

## https://waypointstudio.org/apps/savant-sommelier/vineyard.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/savant-sommelier/settings.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/savant-sommelier/index.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 122

## https://waypointstudio.org/apps/waypoint-volunteer/saved/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/waypoint-volunteer/profile/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/waypoint-volunteer/impact/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/waypoint-scenes/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 4
- **nested-interactive** (serious) — Ensure interactive controls are not nested as they are not always announced by screen readers or can cause focus problems for assistive technologies — nodes: 1

## https://waypointstudio.org/apps/foragecast/season-table.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 2

## https://waypointstudio.org/apps/foragecast/property-setup.html

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 6

## https://waypointstudio.org/apps/dashboard/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 4

## https://waypointstudio.org/apps/foragecast/

- **aria-prohibited-attr** (serious) — Ensure ARIA attributes are not prohibited for an element's role — nodes: 1
- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 11

## https://waypointstudio.org/apps/fieldry/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 4

## https://waypointstudio.org/apps/dashboard/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 5

## https://waypointstudio.org/apps/foragecast/

- **aria-prohibited-attr** (serious) — Ensure ARIA attributes are not prohibited for an element's role — nodes: 1
- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 11

## https://waypointstudio.org/apps/fieldry/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 4

## https://waypointstudio.org/apps/dashboard/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 5

## https://waypointstudio.org/apps/foragecast/

- **aria-prohibited-attr** (serious) — Ensure ARIA attributes are not prohibited for an element's role — nodes: 1
- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 11

## https://waypointstudio.org/apps/fieldry/

- **color-contrast** (serious) — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds — nodes: 4
