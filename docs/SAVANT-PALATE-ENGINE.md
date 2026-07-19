# Savant — Personal Palate Engine Documentation

**Date:** 2026-07-18

## What it learns

From local cellar signals:

- Ratings (weighted by score bands)
- Favorites (strong positive weight)
- Purchases / repeat producers
- Wishlist
- Regions, countries, grapes, styles
- Body / acidity / oak / sweetness cues via notes + catalog enrichment
- Food pairings logged on bottles
- Implied price preference

## Confidence

| Level | Meaning |
|-------|---------|
| low | Few signals — keep recommendations educational |
| emerging | Some favorites/ratings — patterns forming |
| moderate | Several ratings — stronger affinities |

## Outputs used elsewhere

- Recommendation affinity
- Guided discovery neighbors
- Pairing personalization boost
- Tasting “you consistently enjoy / rarely enjoy”
- Purchase coaching

## Honesty

The palate is an **inference**, not a lab sensory panel. It improves as users rate and write concrete notes (acid, oak, body).
