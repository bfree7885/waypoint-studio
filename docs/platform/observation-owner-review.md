# Observation Timeline — Owner Review

**Branch:** `feature/outdoor-intelligence-engine`
**Date:** 2026-08-05
**Recommendation:** Approve as platform infrastructure. No deployment requested.

## Objective

Create one shared observation schema and timeline so Dashboard, Articles, Scenes, and Sheds can consume photos, journals, sightings, weather, trips, articles, species records, and trail conditions through the same contract.

## Decision

Use an adapter-based read model:

1. Keep every product’s local store authoritative.
2. Project those stores into one observation schema.
3. Render that schema through one shared timeline component.

Rejected alternatives:

- Migrating every app into a new shared write store: too invasive, high data-loss risk.
- Replacing WOS with a shallow timeline schema: WOS remains the research-grade biological package.
- Feeding the timeline from AI summarization: forbidden by product standards and unnecessary.

## Delivered

| Item | Status |
|------|--------|
| Shared observation schema v2 | Done |
| Adapters for photos, journals, sightings, weather, trips, articles, species, trail conditions | Done |
| Shared query/list/validate/create APIs | Done |
| Shared timeline renderer | Done |
| Dashboard / Articles / Scenes / Sheds consumption | Done |
| Regression suite | Done |
| Architecture + owner review docs | Done |

## Surface behavior

### Dashboard
- New “Recent observations” deepener above Field Notes.
- Caps weather, trail-condition, and article kinds so they cannot crowd out personal records.
- Local verification rendered 2 timeline items with Field Notes still present.

### Articles
- Quiet observation timeline above the feed.
- Articles themselves are excluded so the publisher list remains primary.
- Empty state is honest when no local private records exist.

### Scenes
- Timeline for photos, trips, sightings, weather, and one article.
- Mobile check: one-column layout, no horizontal overflow, 44px title targets, no coordinates rendered.

### Sheds
- Timeline for sightings, journals, trips, weather, trail conditions, and one article.
- Exact coordinates remain in the Sheds app; the timeline shows only labels/honesty.

## Privacy and honesty

- Source apps remain owners of private data.
- Timeline cards never render exact coordinates or private thumbnails.
- Article cards disclose publisher attribution and open the original.
- Weather and trail cards are labeled as derived conditions.
- Missing sources produce fewer items, not invented events.

## Tests

```bash
node automation/test-observation-timeline.mjs   # PASS
node automation/test-outdoor-recommendations.mjs # PASS
node automation/test-articles-rss.mjs            # PASS
node automation/test-sheds-integration-v1.1.mjs  # PASS
node automation/test-sheds-field-ux.mjs          # PASS
```

Pre-existing failures outside this work remain on `origin/main`:

- `test-platform-experience-rc2.mjs` stale home/catalog expectations
- `test-home-rc1.mjs` support architecture assertion

## Known limitations

1. Weather and trail cards appear only when OIP has already hydrated on that page.
2. Species records appear when callers pass them or when Fieldry/Sheds sightings already include taxon labels; there is no separate species write store yet.
3. Article volume is high relative to private records on cold devices; kind caps keep the surface calm.
4. The timeline is read-only. Creating an observation still happens in the source app.

## Risks

- Low: surface mounts are additive and degrade to honest empty states.
- Medium over time: if new apps invent stores without adapters, they will be invisible until registered.
- Mitigation: `registerAdapter` is the extension point; document new stores in this file when they appear.

## Recommendation

Ship as shared platform infrastructure. Prefer more adapters and better source metadata over creating a parallel observation database.
