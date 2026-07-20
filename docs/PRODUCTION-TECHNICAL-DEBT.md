# Technical Debt — Production Repair Context

**Date:** 2026-07-18

| Item | Severity | Notes |
|---|---|---|
| `wds.js` fan-out | Critical | Blocks public polish |
| Dual nav sources (registry JSON + embedded JS) | Medium | Updated both this sprint; automate sync |
| Boot markup duplicated in HTML + JS generator | Low | Static HTML ensures first paint |
| Cyber JS “Opening” strings | Medium | Migrate to `platformBoot.html` |
| Validator warnings for intentional busy mounts | Low | Tune allowlist |

Debt reduced: foundation routing correctness, first-paint professionalism, route canonicalization.
