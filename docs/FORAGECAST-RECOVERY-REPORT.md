# ForageCast Recovery Report — Sprint 4

## Goal

Answer one question exceptionally well: **What should I look for today, and why?** — with reliable startup, honest locations, and interpreted outdoor intelligence (not raw weather tables).

## Evidence used

From `audits/live-site-qa/`:

| Issue | Severity | Status after Sprint 4 |
| --- | --- | --- |
| Overview shows **“NULL, NY”** | P1 | Fixed — platform + ForageCast label sanitization |
| Season table stuck loading >15s | P1 | Fixed — `platformBoot.watch`, 1.8s loc fallback, fail/retry |
| ~8–9s ForageCast usable wait | Perf | Improved perceived honesty (reliability badge); structural script weight remains |
| `data/live.json` under `/apps/foragecast/` 404 | P2 | Already redirected to site-root `/data/live.json` in Sprint 1; client uses absolute URLs |

## Before → After

| Area | Before | After |
| --- | --- | --- |
| Location label | `null + ", NY"` / poisoned `"null, NY"` displayTitle | Sanitized place parts; coords or “Location in NY” / “Set a place” |
| Season table | Bootstrap hang possible; no watch | Watch 15s + soft loc + fail UI |
| Home trust | Weather uncertain without explicit Ready/Cached/Offline | Reliability chip: Ready / Cached / Offline / Provider unavailable / Location unavailable |
| Conditions copy | Some raw/model labels | Interpretive bullets (soil moisture after rain; dry heat reduces likelihood) |
| Species pages | Fragmented confidence sections | Overview · Season · Habitat · Drivers · Outlook · Confidence · Similar · Safety |

## Architecture (unchanged spine)

Location bootstrap → OIP/weather package → `ForageCastIntelligence` / OIE → summary-first Overview; task pages via `ForageCastShell.bootPage`.

## Honest limits

- Educational suitability index — not live fruiting detections
- Schematic maps only
- Small species set
- Heavy shared `wds-platform.js` chain still dominates cold start
- Multi-provider weather failover still incomplete

## Verification

```bash
node automation/test-foragecast-sprint4.mjs
node automation/test-foragecast-recovery.mjs
node automation/test-foragecast-oie.mjs
```
