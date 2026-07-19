# Steepleaf Changelog — Production Recovery Sprint 3

DO NOT COMMIT / DO NOT PUSH was requested for this sprint; this file records work completed in the tree.

## Startup reliability

- Companion `mount()` waits for models/guides/briefing with deadline, progress status, `platformBoot.watch`, and fail + retry
- `index.html` / `explore/` / `entity/` wait for app modules before mount; fail UI if scripts never arrive
- `platformBoot.status()` added for in-place status updates
- Graph load errors already routed to fail UI; watch timeout shortened to 12s on graph surfaces

## Product clarity

- Home: product lead, four-step onboard (empty shelf), concrete “what you can do” grid
- Peers strip: Private companion · Educational knowledge graph · Labeled sample tea
- Nav: “Tea styles”, “Sessions”, “Journal”; external “Knowledge graph” link
- Explore/entity copy bridges to companion and labels educational samples

## Core workflow

- Brew empty / pick / active states explain pick → variables → timer → notes → history
- Sessions empty state guides collection → brew
- Session links from brew panel to last session / all sessions

## Performance

- Demo graph load cached per base path (explore ↔ entity)

## Content / design / mobile

- “AI summary” → “Educational summary” with journal disclaimer
- Onboard + quick-tile CSS; peers styling; larger mobile touch targets
- Entity footer: Private companion (not “Overview”)

## Testing & docs

- `automation/test-steepleaf-recovery.mjs`
- `docs/STEEPLEAF-RECOVERY-REPORT.md`
- `docs/STEEPLEAF-PERFORMANCE.md`
- `docs/STEEPLEAF-TECHNICAL-DEBT.md`
- `docs/STEEPLEAF-OUTSTANDING-UX.md`
- `docs/STEEPLEAF-READINESS.md`
- This changelog
