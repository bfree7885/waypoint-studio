# Savant — Vineyard Intelligence Documentation (Phase 2)

**Date:** 2026-07-18

## Transparency upgrades

Each horizon now includes:

- **Recommended** grapes with full why paragraphs
- **Not strongly recommended** grapes with **why not**
- Site **strengths** and **risks** with metric why-links
- **Climate trajectory** for Today → 25 years covering heat, season length, disease, freeze language, water demand, variety pressure, and **uncertainty labels**
- Horizon comparison (Today vs 25y) explaining score deltas

## Still educational

GDD, rainfall, humidity, and warming (°C/decade) remain heuristics until authoritative DEM/climate layers are wired. The product must never imply surveyed precision.

## API

- `SavantVineyard.analyzeProperty(input)`
- `SavantVineyard.futureVineyard(analysis, grapeModels)` → includes `strengths`, `risks`, `climateTrajectory`
- `SavantVineyard.siteStrengthsRisks(analysis)`
- `SavantVineyard.climateTrajectory(analysis, grapeModels)`
