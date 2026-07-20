# Savant Changelog — Production Recovery Sprint 8

DO NOT COMMIT / DO NOT PUSH was requested for this sprint; this file records work in the tree.

## Startup reliability

- `WDS.platformBoot.watch` on `#savant-page` (18s) with Retry
- Discover / Learn keep boot shell until JSON loads; `finishBoot` / `failBoot`
- Retryable errors via `SavantShell.errorHtml` + `bindRetry`
- Vineyard analysis fetch failures include Retry

## Knowledge / learning flow

- Discover cards: **Why place matters** narrative from region/country hints
- Learning chain honesty strip (wine → … → tasting)
- Learn **Start here** path: grapes → regions → climate → growing → tasting → pairing
- Cross-links Discover ↔ Learn ↔ Vineyard on cards and topics
- Empty cellar points to Learn + Discover

## Search

- Always score via WIE search, then apply facets
- Hide empty facets (producer, vintage, blend, price, ava, subregion)

## Mobile / design

- 16px inputs, 44px targets, viewport-fit=cover
- Path / chain / place styles in `savant-recovery.css`

## Testing & docs

- `automation/test-savant-sprint8.mjs`
- Sprint 8 recovery / architecture / search / performance / debt / readiness docs
