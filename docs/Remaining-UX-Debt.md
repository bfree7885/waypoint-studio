# Remaining UX Debt — After Experience System V2

## High priority

1. Adopt `emptyPageHtml` / richer `errorHtml` in every empty list (Fieldry, Volunteer saved, Photo Library, Steepleaf sessions)
2. Shared modal/dialog with focus trap + Esc
3. Automated Playwright route smoke + axe on top 20 public URLs
4. Map chrome a11y pass (Sheds + any Leaflet embeds)

## Medium

5. Migrate remaining `.btn` aliases out of CSS (keep temporary dual selectors)
6. Collapse domain-dashboard skeletons (`.wow__skeleton`, flora, etc.) into `.wds-skeleton`
7. Steepleaf `.sl-nav` / SignalTerrain `.st-cyber-nav` markup → `.wds-task-nav` classes
8. WCAG AA contrast audit for Steepleaf light + SignalTerrain cyber
9. Dashboard incremental briefing patch (reduce layout shift on hydrate)

## Low / later

10. Shared toast/notification microinteraction kit
11. Bottom-sheet primitive for mobile filters
12. Visual regression screenshots in CI
13. Full `wds.js` code-split (performance, not cohesion)

## Explicitly out of scope this sprint

- New features / product logic
- University private Scholar redesign
- Brand identity overhaul (Cormorant/Inter remain studio default)
