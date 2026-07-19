# SignalTerrain Changelog — Production Recovery Sprint 5

DO NOT COMMIT / DO NOT PUSH was requested for this sprint; this file records work in the tree.

## Routing & product clarity

- Foundation + home CTA → `cyber/live.html#brief`
- Open now / nav: Live brief first; samples labeled
- Sample summary + brief.html banners point to Live
- Planned receivers/incidents/audio remain `ready: false`

## Startup reliability

- Live: `platformBoot` mount/watch/fail + HTML script wait
- Sample summary: same boot watchdog + fail UI

## Daily brief & trust

- Overview: Critical / High / Medium / Info counts + band blocks with classification why
- Trust strip: trustState, refresh time, ok/planned/unavailable providers
- Cards: source + provider id, retrievedAt, confidence, ranking why, dedupe

## Design / mobile

- Trust strip + band block styles; larger Live nav touch targets ≤800px

## Testing & docs

- `automation/test-signalterrain-sprint5.mjs`
- Recovery, routing, provider, performance, debt, readiness docs + this changelog
