# Outdoor Intelligence Recommendation Engine — Owner Review

**Branch:** `feature/outdoor-intelligence-engine`  
**Date:** 2026-08-05  
**Recommendation:** Approve for merge when ready. No deployment requested in this sprint.

## Objective

Create one shared deterministic recommendation engine that powers Dashboard, Articles, Scenes, and Sheds using existing outdoor context rather than AI.

## Delivered

| Item | Status |
|------|--------|
| Shared engine API `WDS.outdoorRecommendations` | Done |
| 12 declared recommendation domains | Done |
| Deterministic ranking with evidence and honesty | Done |
| Dashboard Field Notes ranking integration | Done |
| Articles contextual recommendation mount | Done |
| Scenes mixed recommendation mount | Done |
| Sheds mixed recommendation mount | Done |
| Regression suite | Done |
| Architecture + owner review docs | Done |

## Architecture decision

Reuse existing domain engines (weather/OIP, trails, observations, article scoring, local photo stores). Add a thin composition layer that:

1. Normalizes available context
2. Matches deterministic rules
3. Filters by surface
4. Ranks and caps results
5. Renders a quiet, accessible recommendation card

This avoids inventing a second weather, trail, or article pipeline while giving every surface the same contract.

## Surface behavior

### Dashboard
- Engine ranks up to three Field Notes articles from the curated feed.
- Existing `dashboardPicks` remain the fallback.
- Weather, alerts, and core observational tiles are unchanged.

### Articles
- Quiet “Observe before you choose a story” section above the feed.
- Uses contextual non-article recommendations so the publisher feed remains the primary experience.

### Scenes
- Replaces topic-only related reading with a mixed recommendation surface.
- Local camera activity / photo metadata can influence practice recommendations.
- At most one related article; photography / astronomy / geology / explicit bird subjects only.

### Sheds
- Replaces topic-only related reading with safety, habitat-observation, and one habitat-oriented article.
- Never claims a find is likely; seasonal context is framed as observation guidance.

## Privacy and honesty

- Local observations and photo metadata remain on-device.
- No AI, model APIs, engagement ranking, or behavioral tracking.
- Missing domains produce fewer recommendations rather than invented certainty.
- Official alerts remain authoritative for hazards.

## Tests run

```bash
node automation/test-outdoor-recommendations.mjs   # PASS
node automation/test-articles-rss.mjs               # PASS
node automation/test-home-rc1.mjs                   # 1 pre-existing FAIL on origin/main
node automation/test-sheds-integration-v1.1.mjs     # PASS
node automation/test-sheds-field-ux.mjs             # PASS
```

Pre-existing failures also observed outside this branch:

- `test-home-rc1.mjs` — `support experiences are Home architecture` fails on `origin/main`
- `test-platform-experience-rc2.mjs` — stale home/catalog expectations
- `test-contact-platform.mjs` — scans local `.worktrees/` copies for an old mailbox string

No new failures were introduced by the recommendation engine.

## Local verification

Local static server review confirmed:

- Articles mount renders recommendation cards and honesty copy
- Scenes and Sheds mount the shared engine
- Dashboard exposes `WDS.outdoorRecommendations` and still renders three Field Notes
- Mobile Articles recommendations collapse to a single column with no horizontal overflow and 44px action targets

## Known limitations

1. Sparse pages without a hydrated OIP package mostly use season, local stores, and article context.
2. Geology / phenology / species recommendations are strongest when callers or OIP supply those domains.
3. Article category metadata can still be noisy for some publisher feeds; surface filters reduce that risk but cannot invent better taxonomy.
4. Camera-activity recommendations depend on local Photo Coach / Photo Library keys already present on the device.

## Risks

- Low: recommendation cards add quiet below-fold content; they do not alter critical safety tiles.
- Medium over time: article taxonomy noise can degrade relevance if publisher categories drift; keep surface filters and tests current.

## Recommendation

Ship the shared engine as platform infrastructure. Prefer gradual enrichment through better domain adapters over expanding AI-like claims.
