# Dashboard V2 — Remaining Work

## Before calling V2 "complete"

### Product
- [ ] Settings UI for preferred activities, comfort bands, sensitivities
- [ ] Briefing detail level toggle (brief / standard / deep)
- [ ] Sticky "Today Outside" shortcut on mobile scroll
- [ ] Panel expand/collapse for overview cards

### Engineering
- [ ] Incremental briefing update (avoid full HTML replace on OIP tick)
- [ ] Playwright suite per TEST-PLAN.md
- [ ] CDP smoke asserts `[data-wdb-v2]` and no eternal `aria-busy`
- [ ] Abortable refresh deduplication in V2 header button
- [ ] `aria-live` announcement when live data replaces cache

### Providers
- [ ] Pollen (optional) behind honest pending status
- [ ] Trail/closure feeds where registry moves to live
- [ ] eBird glance when API key available

### Accessibility
- [ ] Timeline keyboard arrows
- [ ] Owner VoiceOver / NVDA pass

### Performance evidence
- [ ] Measured TTF shell, TTF cached briefing, TTF first live provider (Performance API marks)

## Version 2.0 readiness (honest)

**~60%** toward full spec: core Today Outside loop, activities, timeline, trust, and V1 preservation are in place. Remaining work is mostly settings UX, browser E2E, incremental hydrate, and optional providers—not a rewrite.
