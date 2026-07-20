# Savant Recovery Report — Sprint 8

## Goal

Make Savant Sommelier a reliable educational wine-through-place platform: trustworthy startup, clear place→taste connections, honest search, and an guided Learn path — without social features or dataset expansion.

## Evidence used

From `audits/live-site-qa/` (2026-07-19):

| Finding | Severity | Sprint 8 response |
| --- | --- | --- |
| Savant overall **6.4** | Baseline | Boot, education, search honesty |
| Mass `wds-*.css` 404s | P2 / often axe false positives | Documented; real `@import` resolves under `/design-system/css/` (Sprint 1 clarification) |
| Shell navigable | OK | Timeout + retry when catalog/curriculum hang |

## Before → After

| Area | Before | After |
| --- | --- | --- |
| Boot | Busy cleared before fetch; no watch | `platformBoot.watch` + fail/retry |
| Discover load | Chrome then hang possible | Boot until catalog; failBoot on error |
| Cards | Region meta only | Place narrative + Learn/Vineyard links |
| Learn | Flat topic dump | Ordered Start-here path |
| Search | Query vs facet path diverge | Unified WIE search + facet filter |
| Facets | Producer/vintage empty noise | Skipped until data exists |

## Honest limits

- Soft knowledge graph (hints/strings), not wine→producer→site→geology entities
- Schematic vineyard map (not live DEM/tiles)
- Thin educational catalog (by design this sprint)
- CSS 404 noise in axe audits remains a platform measurement issue

## Verification

```bash
node automation/test-savant-sprint8.mjs
node automation/test-savant-recovery.mjs
node automation/test-savant-wie.mjs
```
